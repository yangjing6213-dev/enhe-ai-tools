export type ArticleVideoMedia = { kind: "native" | "embed"; src: string };

export function resolveArticleVideoPresentation(description: string | null | undefined): "embedded" | "external_link" {
  try {
    const value: unknown = JSON.parse(description ?? "");
    return value && typeof value === "object" && "presentation" in value && value.presentation === "embedded" ? "embedded" : "external_link";
  } catch {
    return "external_link";
  }
}

export function resolveArticleVideoMedia(value: string): ArticleVideoMedia | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;

  if (/\.(mp4|webm|ogv|ogg)$/i.test(url.pathname)) {
    return { kind: "native", src: url.href };
  }

  const host = url.hostname.toLowerCase();
  let youtubeId = "";
  if (host === "youtu.be") youtubeId = url.pathname.slice(1);
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(host)) {
    youtubeId = url.pathname === "/watch"
      ? url.searchParams.get("v") ?? ""
      : url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/)?.[1] ?? "";
  }
  if (/^[\w-]{11}$/.test(youtubeId)) {
    return { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${youtubeId}` };
  }

  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const id = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
    if (id) return { kind: "embed", src: `https://player.vimeo.com/video/${id}?dnt=1` };
  }
  return null;
}

export function localizeArticleVideoText(value: string | null | undefined, locale: "zh" | "en", fallback = "") {
  const text = value?.trim();
  if (!text) return fallback;
  if (!text.startsWith("{")) return text;
  try {
    const localized: unknown = JSON.parse(text);
    if (!localized || typeof localized !== "object") return fallback;
    const candidate = (localized as Record<string, unknown>)[locale];
    return typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback;
  } catch {
    return fallback;
  }
}
