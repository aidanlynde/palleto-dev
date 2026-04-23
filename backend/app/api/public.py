from html import escape
from io import BytesIO

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response
from PIL import Image, ImageColor, ImageDraw, ImageFont, ImageOps

from app.core.config import settings
from app.db.models import CardShare
from app.db.session import SessionLocal, create_db_and_tables
from app.services.shares import build_share_preview_image_url, build_share_url

router = APIRouter(tags=["public"])


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
    marketing_url = settings.public_web_base_url.rstrip("/") if settings.public_web_base_url else share_url
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
    <meta property="og:image:alt" content="{escape(card.title)}" />
    <meta property="og:url" content="{escape(share_url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{escape(card.title)}" />
    <meta name="twitter:description" content="{escape(card.one_line_read)}" />
    <meta name="twitter:image" content="{escape(share_preview_image_url)}" />
    <style>
      :root {{
        color-scheme: dark;
        --bg: #050505;
        --surface: #141414;
        --border: #2a2a2a;
        --text: #ffffff;
        --muted: #a3a3a3;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }}
      .hero {{
        display: grid;
        gap: 24px;
      }}
      .hero-media img {{
        width: 100%;
        border-radius: 8px;
        display: block;
        object-fit: cover;
        max-height: 480px;
      }}
      .hero-copy h1 {{
        margin: 8px 0 12px;
        font-size: clamp(36px, 6vw, 64px);
        line-height: 0.98;
      }}
      .hero-copy p {{
        margin: 0;
        color: var(--muted);
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
        padding: 0 18px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: var(--text);
        color: var(--bg);
        font-weight: 800;
      }}
      .button.secondary {{
        background: transparent;
        color: var(--text);
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
        border-radius: 8px;
      }}
      .panel h3 {{
        margin: 6px 0 12px;
        font-size: 22px;
        line-height: 1.1;
      }}
      .panel p, .panel li {{
        color: var(--muted);
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
        border-radius: 8px;
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
        border-radius: 8px;
        background: rgba(255,255,255,0.02);
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
            <a class="button secondary" href="{escape(marketing_url)}">Get Palleto</a>
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


@router.get("/og/share/{share_token}.png")
def render_public_share_preview_image(share_token: str) -> Response:
    share = _get_share(share_token)
    card = share.card
    image = Image.new("RGB", (1200, 630), "#050505")
    draw = ImageDraw.Draw(image)

    canvas_width = 1200
    canvas_height = 630
    image_height = 412
    body_y = image_height

    _paste_card_image(image, card.image_url, 0, 0, canvas_width, image_height)
    draw.rectangle((0, body_y, canvas_width, canvas_height), fill="#000000")

    brand_font = _font(24, bold=True)
    title_font = _font(54, bold=True)
    body_font = _font(28, bold=False)

    horizontal_padding = 48
    draw.text((horizontal_padding, body_y + 34), "PALLETO", fill="#FFFFFF", font=brand_font)

    title_lines = _wrap_text(
        text=card.title,
        font=title_font,
        max_width=canvas_width - (horizontal_padding * 2),
        max_lines=2,
    )
    title_y = body_y + 82
    for line in title_lines:
        draw.text((horizontal_padding, title_y), line, fill="#FFFFFF", font=title_font)
        title_y += 56

    read_lines = _wrap_text(
        text=card.one_line_read,
        font=body_font,
        max_width=canvas_width - (horizontal_padding * 2),
        max_lines=2,
    )
    read_y = title_y + 8
    for line in read_lines:
        draw.text((horizontal_padding, read_y), line, fill="#BDBDBD", font=body_font)
        read_y += 34

    swatch_y = canvas_height - 42
    for index, color in enumerate(card.palette[:5]):
        swatch_x = horizontal_padding + (index * 86)
        draw.rectangle(
            (swatch_x, swatch_y - 16, swatch_x + 70, swatch_y + 14),
            fill=_safe_color(color["hex"]),
        )

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
) -> None:
    try:
        response = httpx.get(image_url, follow_redirects=True, timeout=6.0)
        response.raise_for_status()
        source_image = Image.open(BytesIO(response.content)).convert("RGB")
    except Exception:
        source_image = Image.new("RGB", (width, height), "#1A1A1A")

    fitted = ImageOps.fit(source_image, (width, height), method=Image.Resampling.LANCZOS)
    canvas.paste(fitted, (x, y))


def _font(size: int, *, bold: bool) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
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
