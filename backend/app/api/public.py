from collections import defaultdict, deque
from datetime import UTC, datetime
from html import escape
from io import BytesIO
from pathlib import Path
from urllib.parse import urlencode
from uuid import uuid4

import httpx
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import HTMLResponse, Response
from PIL import Image, ImageColor, ImageDraw, ImageFont, ImageOps

from app.core.config import settings
from app.db.models import CardShare
from app.db.session import SessionLocal, create_db_and_tables
from app.schemas.card import CardRead
from app.services.link_preview import enrich_related_links
from app.services.openai_card_generator import generate_card_payload_for_image
from app.services.shares import (
    build_share_preview_image_url,
    build_share_url,
)
from app.services.storage import upload_preview_card_image

router = APIRouter(tags=["public"])
APP_DIR = Path(__file__).resolve().parents[1]
FONT_DIR = APP_DIR / "assets" / "fonts"
PREVIEW_MAX_BYTES = 6 * 1024 * 1024
PREVIEW_RATE_LIMIT = 4
PREVIEW_RATE_WINDOW_SECONDS = 15 * 60
_preview_attempts: dict[str, deque[float]] = defaultdict(deque)


@router.post("/api/v1/public/cards/preview", response_model=CardRead, status_code=status.HTTP_201_CREATED)
async def create_public_card_preview(
    request: Request,
    image: UploadFile = File(...),
    source_type: str = Form("camera"),
) -> dict:
    _enforce_preview_rate_limit(request)

    preview_id = f"preview-{uuid4()}"
    _, image_url = await upload_preview_card_image(
        preview_id=preview_id,
        image=image,
        max_bytes=PREVIEW_MAX_BYTES,
    )
    card_payload = generate_card_payload_for_image(
        image_url=image_url,
        project_context=None,
    )
    card_payload["related_links"] = enrich_related_links(
        card_payload["related_links"],
        fallback_queries=card_payload.get("search_language", []),
    )
    created_at = datetime.now(UTC)

    return {
        "id": preview_id,
        "image_url": image_url,
        "source_type": source_type,
        "created_at": created_at,
        "updated_at": created_at,
        **card_payload,
    }


@router.get("/api/v1/public/shares/{share_token}")
def get_public_share_payload(share_token: str) -> dict:
    share = _get_share(share_token)
    card = share.card

    return {
        "share_token": share.share_token,
        "share_url": build_share_url(share.share_token),
        "card": {
            "id": card.id,
            "image_url": card.image_url,
            "title": card.title,
            "one_line_read": card.one_line_read,
            "creative_direction": card.creative_direction,
            "palette": card.palette,
            "project_lens": card.project_lens,
            "type_direction": card.type_direction,
            "related_links": card.related_links,
        },
    }


@router.get("/s/{share_token}", response_class=HTMLResponse)
def render_public_share_page(share_token: str) -> HTMLResponse:
    share = _get_share(share_token)
    card = share.card
    share_url = build_share_url(share.share_token)
    share_preview_image_url = build_share_preview_image_url(share.share_token)
    marketing_url = _build_share_marketing_url(share.share_token)
    app_url = f"palleto://share/{share.share_token}"
    page_title = f"{card.title} | Palleto"
    project_type = escape(card.project_lens.get("project_type", "Creative direction"))
    summary = escape(card.project_lens.get("summary", card.one_line_read))
    applications = card.project_lens.get("applications", [])[:3]
    type_directions = card.type_direction[:3]
    related_links = card.related_links[:3]
    palette_html = "".join(
        [
            (
                "<div class='swatch'>"
                f"<div class='swatch-color' style='background:{escape(color['hex'])}'></div>"
                f"<div class='swatch-meta'><span>{escape(color['label'])}</span>"
                f"<code>{escape(color['hex']).upper()}</code></div></div>"
            )
            for color in card.palette[:5]
        ]
    )
    applications_html = "".join(
        [f"<li>{escape(application)}</li>" for application in applications]
    )
    type_html = "".join(
        [
            (
                "<div class='type-item'>"
                f"<h4>{escape(direction['style'])}</h4>"
                f"<p>{escape(direction['use'])}</p>"
                "</div>"
            )
            for direction in type_directions
        ]
    )
    links_html = "".join(
        [
            (
                "<a class='link-item' href='{url}' target='_blank' rel='noreferrer'>"
                "<span class='link-provider'>{provider}</span>"
                "<strong>{title}</strong>"
                "<p>{reason}</p>"
                "</a>"
            ).format(
                url=escape(link["url"]),
                provider=escape(link["provider"]),
                title=escape(link["title"]),
                reason=escape(link.get("reason") or "Open reference"),
            )
            for link in related_links
        ]
    )

    html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(page_title)}</title>
    <meta name="description" content="{escape(card.one_line_read)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{escape(card.title)}" />
    <meta property="og:description" content="{escape(card.one_line_read)}" />
    <meta property="og:image" content="{escape(share_preview_image_url)}" />
    <meta property="og:image:width" content="1080" />
    <meta property="og:image:height" content="1350" />
    <meta property="og:image:alt" content="{escape(card.title)}" />
    <meta property="og:url" content="{escape(share_url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{escape(card.title)}" />
    <meta name="twitter:description" content="{escape(card.one_line_read)}" />
    <meta name="twitter:image" content="{escape(share_preview_image_url)}" />
    <style>
      :root {{
        color-scheme: light;
        --bg: #F2EEE4;
        --surface: #FFFFFF;
        --surface-soft: #F7F4ED;
        --border: rgba(28,26,23,0.08);
        --border-strong: rgba(28,26,23,0.14);
        --text: #1C1A17;
        --body: #4A4640;
        --muted: #8B847A;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--bg);
        color: var(--text);
      }}
      a {{ color: inherit; text-decoration: none; }}
      .page {{
        width: min(1100px, calc(100% - 32px));
        margin: 0 auto;
        padding: 32px 0 56px;
      }}
      .eyebrow {{
        color: var(--muted);
        font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }}
      .hero {{
        display: grid;
        gap: 24px;
      }}
      .hero-media img {{
        width: 100%;
        border-radius: 32px;
        display: block;
        object-fit: cover;
        max-height: 480px;
        box-shadow: 0 18px 48px rgba(28, 22, 10, 0.12);
      }}
      .hero-copy h1 {{
        margin: 8px 0 12px;
        font-family: Georgia, "Times New Roman", serif;
        font-weight: 400;
        font-size: clamp(36px, 6vw, 64px);
        line-height: 0.98;
      }}
      .hero-copy p {{
        margin: 0;
        color: var(--body);
        font-size: 18px;
        line-height: 1.6;
        max-width: 720px;
      }}
      .cta-row {{
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
      }}
      .button {{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 22px;
        border-radius: 999px;
        border: 1px solid var(--border-strong);
        background: var(--text);
        color: var(--bg);
        font-weight: 700;
        box-shadow: 0 10px 22px rgba(28, 22, 10, 0.12);
      }}
      .button.secondary {{
        background: rgba(255,252,245,0.72);
        color: var(--text);
        box-shadow: 0 8px 18px rgba(28, 22, 10, 0.06);
      }}
      .grid {{
        display: grid;
        gap: 16px;
        margin-top: 28px;
      }}
      .panel {{
        padding: 18px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        box-shadow: 0 8px 28px rgba(28, 22, 10, 0.06);
      }}
      .panel h3 {{
        margin: 6px 0 12px;
        font-weight: 600;
        font-size: 22px;
        line-height: 1.1;
      }}
      .panel p, .panel li {{
        color: var(--body);
        font-size: 15px;
        line-height: 1.6;
      }}
      .swatches {{
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
        gap: 12px;
      }}
      .swatch-color {{
        height: 92px;
        border-radius: 18px;
        margin-bottom: 10px;
      }}
      .swatch-meta {{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 13px;
        font-weight: 700;
      }}
      code {{
        color: var(--muted);
        font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
        font-size: 12px;
      }}
      ul {{ margin: 0; padding-left: 18px; }}
      .type-list, .links {{
        display: grid;
        gap: 12px;
      }}
      .type-item, .link-item {{
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--surface-soft);
      }}
      .type-item h4, .link-item strong {{
        margin: 0 0 6px;
        font-size: 16px;
      }}
      .link-provider {{
        display: block;
        margin-bottom: 6px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }}
      .footer {{
        margin-top: 32px;
        color: var(--muted);
        font-family: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
        font-size: 14px;
      }}
      @media (min-width: 860px) {{
        .hero {{
          grid-template-columns: 1.05fr 0.95fr;
          align-items: start;
        }}
        .grid {{
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }}
        .grid .panel:first-child {{
          grid-column: 1 / -1;
        }}
      }}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="hero-media">
          <img src="{escape(card.image_url)}" alt="{escape(card.title)}" />
        </div>
        <div class="hero-copy">
          <span class="eyebrow">Palleto share</span>
          <h1>{escape(card.title)}</h1>
          <p>{escape(card.one_line_read)}</p>
          <div class="cta-row">
            <a class="button" href="{escape(app_url)}">Open in app</a>
            <a class="button secondary" href="{escape(marketing_url)}">Make yours</a>
          </div>
        </div>
      </section>

      <section class="grid">
        <article class="panel">
          <span class="eyebrow">Creative translation</span>
          <h3>{project_type}</h3>
          <p>{summary}</p>
        </article>
        <article class="panel">
          <span class="eyebrow">Palette</span>
          <h3>Working colors</h3>
          <div class="swatches">{palette_html}</div>
        </article>
        <article class="panel">
          <span class="eyebrow">Use it for</span>
          <h3>Project applications</h3>
          <ul>{applications_html}</ul>
        </article>
        <article class="panel">
          <span class="eyebrow">Type direction</span>
          <h3>Suggested lanes</h3>
          <div class="type-list">{type_html}</div>
        </article>
        <article class="panel">
          <span class="eyebrow">Related inspiration</span>
          <h3>Reference trail</h3>
          <div class="links">{links_html}</div>
        </article>
      </section>

      <p class="footer">Captured and translated with Palleto.</p>
    </main>
  </body>
</html>"""

    return HTMLResponse(content=html)


def _build_share_marketing_url(share_token: str) -> str:
    base_url = settings.public_web_base_url.rstrip("/") if settings.public_web_base_url else build_share_url(share_token)
    separator = "&" if "?" in base_url else "?"
    query = urlencode(
        {
            "utm_source": "palleto_share",
            "utm_medium": "public_share",
            "utm_campaign": "make_yours",
            "share_token": share_token,
        }
    )
    return f"{base_url}{separator}{query}"


def _enforce_preview_rate_limit(request: Request) -> None:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else None
    client_ip = client_ip or (request.client.host if request.client else "unknown")
    now = datetime.now(UTC).timestamp()
    attempts = _preview_attempts[client_ip]

    while attempts and now - attempts[0] > PREVIEW_RATE_WINDOW_SECONDS:
        attempts.popleft()

    if len(attempts) >= PREVIEW_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many preview scans. Try again later.",
        )

    attempts.append(now)


@router.get("/og/share/{share_token}.png")
def render_public_share_preview_image(share_token: str) -> Response:
    """Portrait card image — matches the library Tile exactly.
    1080×1350 displays cleanly in iMessage and most social previews."""
    share = _get_share(share_token)
    card = share.card

    # ── Layout ────────────────────────────────────────────────────────
    canvas_w, canvas_h = 1080, 1350
    margin = 40
    card_x, card_y = margin, 44
    card_w = canvas_w - 2 * margin          # 1000 px
    card_r = 32
    image_h = int(card_w / 1.16)           # ≈ 862 px — matches Tile aspectRatio

    body_px = 26    # horizontal padding inside body
    body_py = 22    # vertical padding inside body

    title_font    = _serif_font(56)
    meta_font     = _font(21, bold=False)
    brand_font    = _font(17, bold=True)
    title_line_h  = 62
    palette_bar_h = 16

    title_lines = _wrap_text(
        text=card.title,
        font=title_font,
        max_width=card_w - 2 * body_px,
        max_lines=2,
    )

    body_h = (
        body_py
        + 22                                    # meta line
        + 12                                    # gap
        + len(title_lines) * title_line_h       # title
        + 20                                    # gap
        + palette_bar_h
        + body_py
    )
    card_h = image_h + body_h

    # ── Canvas ────────────────────────────────────────────────────────
    image = Image.new("RGB", (canvas_w, canvas_h), "#F2EEE4")
    draw  = ImageDraw.Draw(image)

    # Card white background
    draw.rounded_rectangle(
        (card_x, card_y, card_x + card_w, card_y + card_h),
        radius=card_r, fill="#FFFFFF",
    )

    # Photo — fills top of card, rounded at the top corners only
    _paste_card_image_top_rounded(
        image, card.image_url,
        card_x, card_y, card_w, image_h, radius=card_r,
    )

    # Card border
    draw.rounded_rectangle(
        (card_x, card_y, card_x + card_w, card_y + card_h),
        radius=card_r, outline="#E8E1D5", width=2,
    )

    # ── Body ──────────────────────────────────────────────────────────
    bx = card_x + body_px
    by = card_y + image_h + body_py

    # Meta date — "05.12 · 14:39"
    draw.text(
        (bx, by),
        _format_card_date(card.created_at).upper(),
        fill="#8B847A", font=meta_font,
    )
    by += 22 + 12

    # Title in Instrument Serif
    for line in title_lines:
        draw.text((bx, by), line, fill="#1C1A17", font=title_font)
        by += title_line_h

    by += 20

    # Palette swatches
    n = min(len(card.palette), 5)
    if n:
        gap = 8
        sw = (card_w - 2 * body_px - (n - 1) * gap) // n
        for i, color in enumerate(card.palette[:n]):
            sx = bx + i * (sw + gap)
            draw.rounded_rectangle(
                (sx, by, sx + sw, by + palette_bar_h),
                radius=palette_bar_h // 2,
                fill=_safe_color(color["hex"]),
            )

    # Palleto brand mark centred at bottom of canvas
    draw.text(
        (canvas_w // 2, canvas_h - 28),
        "PALLETO",
        fill="#8B847A", font=brand_font, anchor="mm",
    )

    png = BytesIO()
    image.save(png, format="PNG")
    return Response(content=png.getvalue(), media_type="image/png")


@router.get("/share/card/{share_token}.png")
def render_public_share_card_image(share_token: str) -> Response:
    share = _get_share(share_token)
    card = share.card
    width = 1080
    image_height = 680
    body_height = 360
    height = image_height + body_height
    image = Image.new("RGB", (width, height), "#F2EEE4")
    draw = ImageDraw.Draw(image)

    outer_padding = 34
    draw.rounded_rectangle((outer_padding, outer_padding, width - outer_padding, height - outer_padding), radius=38, fill="#FFFFFF")
    _paste_card_image(image, card.image_url, 58, 58, width - 116, image_height - 42, radius=32)

    brand_font = _font(26, bold=True)
    title_font = _font(64, bold=True)
    body_font = _font(34, bold=False)
    padding = 68
    body_top = image_height + 38

    draw.text((padding, body_top), "PALLETO SHARE", fill="#8B847A", font=brand_font)

    title_lines = _wrap_text(
        text=card.title,
        font=title_font,
        max_width=width - (padding * 2),
        max_lines=2,
    )
    title_y = body_top + 48
    for line in title_lines:
        draw.text((padding, title_y), line, fill="#1C1A17", font=title_font)
        title_y += 74

    read_lines = _wrap_text(
        text=card.one_line_read,
        font=body_font,
        max_width=width - (padding * 2),
        max_lines=2,
    )
    read_y = title_y + 8
    for line in read_lines:
        draw.text((padding, read_y), line, fill="#4A4640", font=body_font)
        read_y += 44

    swatch_gap = 8
    swatch_count = min(len(card.palette[:5]) or 1, 5)
    swatch_width = (width - (padding * 2) - (swatch_gap * (swatch_count - 1))) // swatch_count
    swatch_y = height - 94
    for index, color in enumerate(card.palette[:5]):
        swatch_x = padding + (index * (swatch_width + swatch_gap))
        draw.rounded_rectangle(
            (swatch_x, swatch_y, swatch_x + swatch_width, swatch_y + 34),
            radius=12,
            fill=_safe_color(color["hex"]),
        )

    draw.rounded_rectangle((outer_padding, outer_padding, width - outer_padding, height - outer_padding), radius=38, outline="#E8E1D5", width=2)

    png = BytesIO()
    image.save(png, format="PNG")
    return Response(content=png.getvalue(), media_type="image/png")


def _get_share(share_token: str) -> CardShare:
    create_db_and_tables()
    db = SessionLocal()

    try:
        share = db.query(CardShare).filter(CardShare.share_token == share_token).one_or_none()

        if share is None:
            raise HTTPException(status_code=404, detail="Share not found.")

        _ = share.card
        return share
    finally:
        db.close()


def _paste_card_image(
    canvas: Image.Image,
    image_url: str,
    x: int,
    y: int,
    width: int,
    height: int,
    radius: int = 0,
) -> None:
    try:
        response = httpx.get(image_url, follow_redirects=True, timeout=6.0)
        response.raise_for_status()
        source_image = Image.open(BytesIO(response.content))
        source_image = ImageOps.exif_transpose(source_image).convert("RGB")
    except Exception:
        source_image = Image.new("RGB", (width, height), "#1A1A1A")

    fitted = ImageOps.fit(source_image, (width, height), method=Image.Resampling.LANCZOS)
    if radius <= 0:
        canvas.paste(fitted, (x, y))
        return

    mask = Image.new("L", (width, height), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, width, height), radius=radius, fill=255)
    canvas.paste(fitted, (x, y), mask)


def _serif_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(str(FONT_DIR / "InstrumentSerif_400Regular.ttf"), size=size)
    except OSError:
        return _font(size, bold=False)


def _format_card_date(created_at: object) -> str:
    try:
        d = created_at if hasattr(created_at, "day") else datetime.fromisoformat(str(created_at))
        return f"{d.day:02d}.{d.month:02d} · {d.hour:02d}:{d.minute:02d}"
    except Exception:
        return ""


def _paste_card_image_top_rounded(
    canvas: Image.Image,
    image_url: str,
    x: int,
    y: int,
    width: int,
    height: int,
    radius: int,
) -> None:
    """Paste a fitted image with rounded top corners and square bottom corners."""
    try:
        response = httpx.get(image_url, follow_redirects=True, timeout=6.0)
        response.raise_for_status()
        source = Image.open(BytesIO(response.content))
        source = ImageOps.exif_transpose(source).convert("RGB")
    except Exception:
        source = Image.new("RGB", (width, height), "#DDD8CE")

    fitted = ImageOps.fit(source, (width, height), method=Image.Resampling.LANCZOS)

    # Mask: rounded top corners, square bottom corners
    mask = Image.new("L", (width, height), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle((0, radius, width, height), fill=255)               # body below arc
    md.rectangle((radius, 0, width - radius, radius), fill=255)      # top centre strip
    md.ellipse((0, 0, radius * 2, radius * 2), fill=255)             # top-left arc
    md.ellipse((width - radius * 2, 0, width, radius * 2), fill=255) # top-right arc

    canvas.paste(fitted, (x, y), mask)


def _font(size: int, *, bold: bool) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        str(FONT_DIR / ("Inter-Bold.otf" if bold else "Inter-Regular.otf")),
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]

    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue

    return ImageFont.load_default()


def _wrap_text(
    *,
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> list[str]:
    words = text.split()
    if not words:
        return []

    lines: list[str] = []
    current = words[0]

    for word in words[1:]:
        candidate = f"{current} {word}"
        if font.getlength(candidate) <= max_width:
            current = candidate
            continue

        lines.append(current)
        current = word

        if len(lines) == max_lines - 1:
            break

    remaining = current
    if len(lines) < max_lines:
        lines.append(remaining)

    if len(lines) > max_lines:
        lines = lines[:max_lines]

    if len(lines) == max_lines and (len(words) > sum(len(line.split()) for line in lines)):
        lines[-1] = f"{lines[-1].rstrip('.')}…"

    return lines


def _safe_color(value: str) -> str:
    try:
        ImageColor.getrgb(value)
        return value
    except ValueError:
        return "#FFFFFF"
