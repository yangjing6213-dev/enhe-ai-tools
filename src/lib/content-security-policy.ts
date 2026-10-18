/** Keep executable scripts nonce-bound while allowing the site's inline animation styles. */
export function buildContentSecurityPolicy(nonce: string, development: boolean) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""} https://lf1-cdn-tos.bytegoofy.com`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https:",
    "worker-src 'self' blob:",
    "report-uri /api/csp-report",
    "report-to csp-endpoint",
  ].join("; ");
}
