const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function parseAdminVisualLoopbackBaseUrl(
  baseURL: string | undefined,
): URL {
  try {
    const parsed = new URL(baseURL ?? "");
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !loopbackHosts.has(parsed.hostname) ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error("Invalid admin visual fixture base URL.");
    }
    return parsed;
  } catch {
    throw new Error(
      "Admin visual fixtures require an explicit loopback base URL.",
    );
  }
}
