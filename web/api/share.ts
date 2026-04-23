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
  const html = await upstreamResponse.text();

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
