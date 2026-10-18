/** Unknown addresses need a readable 404 and a home link, without hydration scripts. */
export function createMissingPageResponse(locale: "zh" | "en") {
  const english = locale === "en";
  const language = english ? "en-US" : "zh-CN";
  const title = english ? "Page not found" : "页面未找到";
  const description = english
    ? "This address may have changed, or the page has been removed."
    : "这个地址可能已更改，或页面已经移除。";
  const home = english ? "/en" : "/";
  const label = english ? "Return home" : "返回首页";
  // Values are fixed copy; the requested URL is never reflected into HTML.
  const html = `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, follow"><title>404 · ${title} | ENHE AI</title><style>body{margin:0;background:#f5f8fc;color:#172b46;font:16px/1.7 system-ui,sans-serif}main{max-width:600px;margin:12vh auto;padding:32px}h1{font-size:64px;line-height:1;color:#0564ca}h2{font-size:26px}a{display:inline-block;margin-top:16px;padding:10px 20px;border-radius:24px;background:#0564ca;color:white;text-decoration:none}a:focus-visible{outline:3px solid #172b46;outline-offset:4px}</style></head><body><main><h1>404</h1><h2>${title}</h2><p>${description}</p><a href="${home}">${label}</a></main></body></html>`;
  return new Response(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Language": language,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
