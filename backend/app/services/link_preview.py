from html.parser import HTMLParser
import string
from urllib.parse import parse_qs, quote, unquote, urljoin, urlparse

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


# Search platforms used for fallback links, cycled across available queries.
# Index 0 gets the first (most image-specific) query, etc.
_FALLBACK_PLATFORMS = [
    ("Are.na",        "https://www.are.na/search?q={q}"),
    ("Pinterest",     "https://www.pinterest.com/search/pins/?q={q}"),
    ("Google Images", "https://www.google.com/search?tbm=isch&q={q}"),
    ("Are.na",        "https://www.are.na/search?q={q}"),
]


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
    original_url = _clean_url(link.get("url"))
    if not original_url:
        return None

    url_lower = original_url.lower()

    # Hard-reject wildcard search URLs — they always return "Results for '*'"
    if "q=*" in url_lower or "q=%2a" in url_lower:
        return None

    # For known search page URLs (are.na/search, pinterest/search, google images):
    # don't fetch — the page title is just "Results for '...'" and adds no value.
    # Return the link using the query as the title so the user sees what they'll find.
    if _is_search_url(original_url):
        query = _search_query_from_url(original_url)
        title = _clean_fallback_query(link.get("title")) or (
            _clean_fallback_query(query) if query else None
        )
        if not title:
            return None
        return {
            **link,
            "provider": _clean_provider(link.get("provider"), original_url),
            "reason": _clean_reason(link.get("reason")),
            "url": original_url,
            "thumbnail_url": None,
            "title": title,
        }

    # Specific page URL — fetch OG data
    preview = _fetch_preview(original_url)
    if not preview:
        return None

    title = _clean_fallback_query(preview.get("title")) or _clean_fallback_query(link.get("title"))
    if not title:
        return None

    return {
        **link,
        "provider": _clean_provider(link.get("provider"), preview.get("url") or original_url),
        "reason": _clean_reason(link.get("reason")),
        "url": preview.get("url") or original_url,
        "thumbnail_url": preview.get("image") or None,
        "title": title,
    }


def _is_search_url(url: str) -> bool:
    """True for search/query result pages that don't need individual fetching."""
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    path = parsed.path.lower()
    query = parsed.query.lower()
    return (
        ("are.na" in host and "/search" in path)
        or ("pinterest.com" in host and "/search" in path)
        or ("google.com" in host and "tbm=isch" in query)
        or ("behance.net" in host and "/search" in path)
    )


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
    """
    Build search-lane fallback links spread across multiple platforms.

    Query priority:
      1. Explicit fallback_queries (search_language from the AI card)
      2. Titles from source links that are usable search phrases
      3. Query params extracted from source link URLs
    """
    queries: list[str] = []
    seen_queries: set[str] = set()

    for raw_query in [
        *fallback_queries,
        *[str(link.get("title") or "").strip() for link in source_links],
        *[_search_query_from_url(link.get("url")) for link in source_links],
    ]:
        query = _clean_fallback_query(raw_query)
        if not query or query.lower() in seen_queries:
            continue
        seen_queries.add(query.lower())
        queries.append(query)

    if not queries:
        queries = ["design inspiration visual reference"]

    fallback_links: list[dict] = []
    for i, query in enumerate(queries[:4]):
        platform_name, url_template = _FALLBACK_PLATFORMS[i % len(_FALLBACK_PLATFORMS)]
        fallback_links.append(
            {
                "provider": platform_name,
                "reason": None,
                "thumbnail_url": None,
                "title": query,
                "url": url_template.format(q=quote(query)),
            }
        )

    return fallback_links


def _clean_fallback_query(raw_query: object) -> str | None:
    query = unquote(str(raw_query or "")).strip()
    if not query:
        return None

    lowered_query = query.lower()

    # Strip known provider prefixes
    for prefix in ["are.na query:", "pinterest query:", "google images:", "search:"]:
        if lowered_query.startswith(prefix):
            query = query[len(prefix):].strip()
            lowered_query = query.lower()
            break

    # Reject wildcard search signatures
    if "q=*" in lowered_query or "q=%2a" in lowered_query:
        return None

    # Reject "Results for '...'" page titles (these come from fetching search pages)
    if lowered_query.startswith("results for"):
        return None

    # Reject strings that contain wildcard characters in quotes
    if '"*"' in query or "'*'" in query or " * " in query:
        return None

    # Reject known junk values
    if lowered_query in {
        "*",
        "-",
        "—",
        "related inspiration",
        "search this visual direction",
        "open reference",
        "placeholder",
        "visual search lane based on this scan.",
    }:
        return None

    if lowered_query.startswith("are.na") and "*" in lowered_query:
        return None

    alphanumeric_count = sum(character.isalnum() for character in query)
    punctuation_count = sum(character in string.punctuation for character in query)
    if alphanumeric_count < 3 or punctuation_count >= max(2, alphanumeric_count):
        return None

    return " ".join(query.split())


def _clean_url(raw_url: object) -> str | None:
    url = str(raw_url or "").strip()
    if not url:
        return None

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return None

    return url


def _clean_provider(raw_provider: object, url: str) -> str:
    provider = str(raw_provider or "").strip()
    if provider and provider.lower() not in {"placeholder", "unknown"}:
        return provider

    host = urlparse(url).netloc.replace("www.", "")
    if "are.na" in host:
        return "Are.na"
    if "pinterest" in host:
        return "Pinterest"
    if "behance" in host:
        return "Behance"
    if "google" in host:
        return "Google Images"

    return host or "Reference"


def _clean_reason(raw_reason: object) -> str | None:
    reason = str(raw_reason or "").strip()
    if not reason or "fallback" in reason.lower() or reason.lower() == "placeholder":
        return None

    return reason


def _search_query_from_url(raw_url: object) -> str | None:
    url = _clean_url(raw_url)
    if not url:
        return None

    parsed = urlparse(url)
    query_values = parse_qs(parsed.query).get("q")
    if not query_values:
        return None

    return query_values[0]
