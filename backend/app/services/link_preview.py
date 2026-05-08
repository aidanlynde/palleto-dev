from html.parser import HTMLParser
import string
from urllib.parse import quote, urljoin, urlparse

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


def enrich_related_links(
    links: list[dict],
    *,
    fallback_queries: list[str] | None = None,
) -> list[dict]:
    enriched_links: list[dict] = []
    seen_urls: set[str] = set()

    for link in links:
        enriched_link = _enrich_link(link)
        if not enriched_link:
            continue

        normalized_url = enriched_link["url"].strip()
        if normalized_url in seen_urls:
            continue

        seen_urls.add(normalized_url)
        enriched_links.append(enriched_link)

    if len(enriched_links) >= 3:
        return enriched_links[:4]

    for fallback_link in _fallback_links(links, fallback_queries or []):
        normalized_url = fallback_link["url"]
        if normalized_url in seen_urls:
            continue

        seen_urls.add(normalized_url)
        enriched_links.append(fallback_link)

        if len(enriched_links) >= 4:
            break

    return enriched_links[:4]


def _enrich_link(link: dict) -> dict | None:
    preview = _fetch_preview(link.get("url"))
    if not preview:
        return None

    return {
        **link,
        "url": preview.get("url") or link.get("url"),
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
    final_url = str(response.url)

    if _looks_invalid_page(final_url, title, response.text[:6_000]):
        return None

    return {
        "image": urljoin(str(response.url), image) if image else "",
        "title": title or "",
        "url": final_url,
    }


def _looks_invalid_page(url: str, title: str | None, snippet: str) -> bool:
    lowered_title = (title or "").strip().lower()
    lowered_snippet = snippet.lower()
    invalid_markers = [
        "404",
        "not found",
        "page not found",
        "access denied",
        "error",
        "captcha",
        "temporarily unavailable",
    ]

    if any(marker in lowered_title for marker in invalid_markers):
        return True

    if "404" in lowered_snippet and "not found" in lowered_snippet:
        return True

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return True

    return False


def _fallback_links(source_links: list[dict], fallback_queries: list[str]) -> list[dict]:
    queries = []
    seen_queries: set[str] = set()
    for raw_query in [
        *fallback_queries,
        *[str(link.get("title") or "").strip() for link in source_links],
    ]:
        query = _clean_fallback_query(raw_query)
        if not query or query.lower() in seen_queries:
            continue

        seen_queries.add(query.lower())
        queries.append(query)

    if not queries:
        queries = ["design inspiration visual reference"]

    fallback_links: list[dict] = []
    for query in queries[:4]:
        fallback_links.append(
            {
                "provider": "Are.na",
                "reason": "Fallback visual search lane based on this direction.",
                "thumbnail_url": None,
                "title": query,
                "url": f"https://www.are.na/search?q={quote(query)}",
            }
        )

    return fallback_links


def _clean_fallback_query(raw_query: object) -> str | None:
    query = str(raw_query or "").strip()
    if not query:
        return None

    lowered_query = query.lower()
    for prefix in ["are.na query:", "pinterest query:", "google images:", "search:"]:
        if lowered_query.startswith(prefix):
            query = query[len(prefix) :].strip()
            lowered_query = query.lower()
            break

    if lowered_query in {
        "*",
        "related inspiration",
        "search this visual direction",
        "open reference",
    }:
        return None

    alphanumeric_count = sum(character.isalnum() for character in query)
    punctuation_count = sum(character in string.punctuation for character in query)
    if alphanumeric_count < 3 or punctuation_count >= max(2, alphanumeric_count):
        return None

    return " ".join(query.split())
