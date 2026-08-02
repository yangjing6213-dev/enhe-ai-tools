import { normalizeImageSrc } from "@/lib/media";

const toolImageKeyPattern = /^(?:tool-(?:cover|product)|product-demo-cover)-[^/]+\/.+\.(?:avif|gif|jpe?g|png|webp)$/i;

export function isToolImageSource(value?: string | null) {
  const source = value?.trim();
  if (!source) return false;

  if (source.startsWith("cos://")) {
    const slashIndex = source.indexOf("/", "cos://".length);
    return slashIndex >= 0 && isToolImageKey(source.slice(slashIndex + 1));
  }

  try {
    const url = new URL(source);
    const isCosHost = /\.cos\.[^.]+\.(?:myqcloud\.com|tencentcos\.cn)$/i.test(url.hostname);
    return isCosHost && isToolImageKey(decodeURIComponent(url.pathname).replace(/^\/+/, ""));
  } catch {
    return false;
  }
}

export function resolveToolImageSrc(value?: string | null) {
  const source = value?.trim();
  if (!source) return null;
  if (isToolImageSource(source)) {
    return `/api/tool-images?src=${encodeURIComponent(source)}`;
  }
  return normalizeImageSrc(source);
}

function isToolImageKey(key: string) {
  return (
    toolImageKeyPattern.test(key) &&
    key.split("/").every((part) => part && part !== "." && part !== "..")
  );
}
