from html.parser import HTMLParser
from urllib.parse import urljoin

import httpx

from app.core.config import settings


class MetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "meta":
            return

        attr_map = {name.lower(): value for name, value in attrs if value}
        key = attr_map.get("property") or attr_map.get("name")
        content = attr_map.get("content")

        if key and content:
            self.meta[key.lower()] = content


def enrich_related_links(links: list[dict]) -> list[dict]:
    return [_enrich_link(link) for link in links]


def _enrich_link(link: dict) -> dict:
    if link.get("thumbnail_url"):
        return link

    preview = _fetch_preview(link.get("url"))
    if not preview:
        return link

    return {
        **link,
        "thumbnail_url": preview.get("image") or link.get("thumbnail_url"),
        "title": preview.get("title") or link.get("title"),
    }


def _fetch_preview(url: str | None) -> dict[str, str] | None:
    if not url:
        return None

    preview = _fetch_microlink_preview(url)
    if preview and preview.get("image"):
        return preview

    try:
        with httpx.Client(
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; PalletoPreviewBot/0.1; "
                    "+https://palleto.app)"
                )
            },
            timeout=2.5,
        ) as client:
            response = client.get(url)
            response.raise_for_status()
    except httpx.HTTPError:
        return None

    parser = MetaParser()
    parser.feed(response.text[:80_000])
    image = parser.meta.get("og:image") or parser.meta.get("twitter:image")
    title = (
        parser.meta.get("og:title")
        or parser.meta.get("twitter:title")
        or parser.meta.get("title")
    )

    return {
        "image": urljoin(str(response.url), image) if image else "",
        "title": title or "",
    }


def _fetch_microlink_preview(url: str) -> dict[str, str] | None:
    headers = {}
    if settings.microlink_api_key:
        headers["x-api-key"] = settings.microlink_api_key

    try:
        with httpx.Client(follow_redirects=True, timeout=5.0) as client:
            response = client.get(
                "https://api.microlink.io",
                headers=headers,
                params={
                    "audio": "false",
                    "iframe": "false",
                    "palette": "false",
                    "screenshot": "true",
                    "url": url,
                    "video": "false",
                },
            )
            response.raise_for_status()
            body = response.json()
    except (httpx.HTTPError, ValueError):
        return None

    if body.get("status") != "success":
        return None

    data = body.get("data") or {}
    image = _extract_image_url(data.get("image")) or _extract_image_url(data.get("screenshot"))

    return {
        "image": image,
        "title": data.get("title") or "",
    }


def _extract_image_url(value: object) -> str:
    if isinstance(value, str):
        return value

    if isinstance(value, dict):
        url = value.get("url")
        if isinstance(url, str):
            return url

    return ""
