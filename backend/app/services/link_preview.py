from html.parser import HTMLParser
from urllib.parse import urljoin

import httpx


class MetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}
        self._inside_title = False
        self.title = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "title":
            self._inside_title = True
            return

        if tag.lower() != "meta":
            return

        attr_map = {name.lower(): value for name, value in attrs if value}
        key = attr_map.get("property") or attr_map.get("name")
        content = attr_map.get("content")

        if key and content:
            self.meta[key.lower()] = content

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._inside_title = False

    def handle_data(self, data: str) -> None:
        if self._inside_title:
            self.title += data


def enrich_related_links(links: list[dict]) -> list[dict]:
    return [_enrich_link(link) for link in links]


def _enrich_link(link: dict) -> dict:
    preview = _fetch_preview(link.get("url"))
    if not preview:
        return {
            **link,
            "thumbnail_url": None,
        }

    return {
        **link,
        "thumbnail_url": preview.get("image") or None,
        "title": preview.get("title") or link.get("title"),
    }


def _fetch_preview(url: str | None) -> dict[str, str] | None:
    if not url:
        return None

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
        or parser.title.strip()
    )

    return {
        "image": urljoin(str(response.url), image) if image else "",
        "title": title or "",
    }
