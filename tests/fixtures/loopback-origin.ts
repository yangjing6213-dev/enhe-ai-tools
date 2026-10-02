const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isSameLoopbackOrigin(requestUrl: string, baseURL: string): boolean {
  try {
    const request = new URL(requestUrl);
    const base = new URL(baseURL);
    const isSafeLoopback = (url: URL) =>
      ["http:", "https:"].includes(url.protocol) &&
      loopbackHosts.has(url.hostname) &&
      !url.username &&
      !url.password;

    return isSafeLoopback(request) && isSafeLoopback(base) && request.origin === base.origin;
  } catch {
    return false;
  }
}
