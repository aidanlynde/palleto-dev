export default async function handler(req: any, res: any) {
  const token = Array.isArray(req.query?.token) ? req.query.token[0] : req.query?.token;
  const upstreamBaseUrl =
    process.env.SHARE_PROXY_BASE_URL ||
    process.env.PUBLIC_API_BASE_URL ||
    process.env.VITE_PUBLIC_API_BASE_URL;

  if (!token) {
    res.status(400).send("Missing share token.");
    return;
  }

  if (!upstreamBaseUrl) {
    res
      .status(500)
      .send("Share proxy is not configured. Set SHARE_PROXY_BASE_URL or PUBLIC_API_BASE_URL.");
    return;
  }

  const upstreamUrl = `${upstreamBaseUrl.replace(/\/$/, "")}/s/${encodeURIComponent(token)}`;
  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      "User-Agent": req.headers["user-agent"] ?? "PalletoShareProxy",
    },
  });
  const html = applyPalletoVisualSystem(await upstreamResponse.text());

  res.status(upstreamResponse.status);
  res.setHeader(
    "Content-Type",
    upstreamResponse.headers.get("content-type") ?? "text/html; charset=utf-8"
  );

  const cacheControl = upstreamResponse.headers.get("cache-control");
  if (cacheControl) {
    res.setHeader("Cache-Control", cacheControl);
  }

  res.send(html);
}

function applyPalletoVisualSystem(html: string) {
  if (!html.includes("</style>") || !html.includes("Palleto")) {
    return html;
  }

  return html
    .replace("</head>", `${palletoShareFontLinks}</head>`)
    .replace("</style>", `${palletoShareVisualSystem}</style>`);
}

const palletoShareFontLinks = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
`;

const palletoShareVisualSystem = `
      :root {
        color-scheme: light;
        --bg: #f2eee4;
        --surface: #ffffff;
        --surface-soft: #f7f4ed;
        --border: rgba(28, 26, 23, 0.07);
        --text: #1c1a17;
        --muted: #8b847a;
        --ink-2: #4a4640;
        --glass: rgba(255, 252, 245, 0.76);
        --shadow-1: 0 1px 1.5px rgba(28, 22, 10, 0.04), 0 2px 6px rgba(28, 22, 10, 0.04);
        --shadow-2: 0 1px 2px rgba(28, 22, 10, 0.05), 0 8px 20px rgba(28, 22, 10, 0.06);
      }
      body {
        font-family: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 18% 6%, rgba(255, 255, 255, 0.58), transparent 34rem),
          radial-gradient(circle at 92% 88%, rgba(220, 210, 190, 0.28), transparent 38rem),
          var(--bg);
        color: var(--text);
        -webkit-font-smoothing: antialiased;
      }
      .page { padding: 28px 0 64px; }
      .eyebrow, .link-provider, code {
        font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
        font-weight: 500;
        letter-spacing: 0.08em;
      }
      .hero { gap: 28px; }
      .hero-media {
        padding: 10px 10px 12px;
        border-radius: 24px;
        background: var(--surface);
        box-shadow: var(--shadow-2);
      }
      .hero-media img {
        border-radius: 16px;
        max-height: none;
        aspect-ratio: 4 / 5;
        box-shadow: none;
      }
      .hero-copy h1, .panel h3 {
        font-family: "Instrument Serif", Georgia, serif;
        font-weight: 400;
        letter-spacing: 0;
      }
      .hero-copy h1 {
        margin-top: 10px;
        font-size: clamp(44px, 7vw, 82px);
        line-height: 0.94;
      }
      .hero-copy p, .panel p, .panel li {
        color: var(--ink-2);
      }
      .button {
        border-radius: 999px;
        border-color: var(--text);
        background: var(--text);
        color: #ffffff;
        font-weight: 500;
        box-shadow: var(--shadow-2);
      }
      .button.secondary {
        background: var(--glass);
        color: var(--text);
        border-color: rgba(28, 26, 23, 0.06);
        box-shadow: 0 1px 2px rgba(28, 22, 10, 0.07), 0 8px 24px rgba(28, 22, 10, 0.06), inset 0 1px 0 rgba(255,255,255,0.7);
        -webkit-backdrop-filter: blur(18px) saturate(180%);
        backdrop-filter: blur(18px) saturate(180%);
      }
      .panel {
        border: 0;
        border-radius: 24px;
        background: var(--surface);
        box-shadow: var(--shadow-1);
      }
      .panel h3 {
        font-size: 30px;
        line-height: 1.05;
      }
      .swatch-color {
        border-radius: 12px;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
      }
      .type-item, .link-item {
        border-color: var(--border);
        border-radius: 18px;
        background: var(--surface-soft);
      }
      .footer {
        color: var(--muted);
        font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
        font-size: 10.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
`;
