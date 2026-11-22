export function canShowDownloadLinkArea(input: { hasDownloadLink: boolean; isDownloadPaid: boolean; hasDownloadPurchase: boolean }) {
  if (!input.hasDownloadLink) return false;
  return !input.isDownloadPaid || input.hasDownloadPurchase;
}

export function getDownloadCtaLabel(input: {
  locale: "zh" | "en";
  isPaid: boolean;
  hasPurchase: boolean;
  isLoggedIn: boolean;
  hasPublicDirectDownload: boolean;
}) {
  const { locale, isPaid, hasPurchase, isLoggedIn, hasPublicDirectDownload } = input;
  if (isPaid) {
    if (hasPurchase) return locale === "zh" ? "下载已购内容" : "Download Purchased Content";
    if (isLoggedIn) return locale === "zh" ? "购买后下载" : "Download After Purchase";
    return locale === "zh" ? "登录后购买" : "Sign In to Purchase";
  }

  if (!isLoggedIn && !hasPublicDirectDownload) {
    return locale === "zh" ? "登录后下载" : "Sign In to Download";
  }

  return locale === "zh" ? "免费下载" : "Download Free";
}

export function getDownloadLinkContent(file?: { filePath?: string | null; fileUrl?: string | null } | null) {
  const content = file?.fileUrl ?? file?.filePath ?? "";
  return content.trim() ? content.replace(/\r\n?/g, "\n") : "";
}

export type DownloadLinkContentSegment =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

const absoluteHttpUrlPattern = /https?:\/\/[^\s<>"'，。；：！？、）】》]+/gi;
const trailingUrlPunctuationPattern = /[),.;:!?，。；：！？、）】》]+$/u;

export function linkifyDownloadLinkContent(content: string): DownloadLinkContentSegment[] {
  const segments: DownloadLinkContentSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(absoluteHttpUrlPattern)) {
    const rawUrl = match[0];
    const matchIndex = match.index ?? 0;
    const href = rawUrl.replace(trailingUrlPunctuationPattern, "");
    const trailingText = rawUrl.slice(href.length);

    if (matchIndex > lastIndex) {
      segments.push({ type: "text", text: content.slice(lastIndex, matchIndex) });
    }

    segments.push({ type: "link", text: href, href });
    if (trailingText) {
      segments.push({ type: "text", text: trailingText });
    }

    lastIndex = matchIndex + rawUrl.length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", text: content.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", text: content }];
}

export function canOpenProtectedDownloadEntry(content: string) {
  if (/^https?:\/\//i.test(content)) {
    const segments = linkifyDownloadLinkContent(content);
    return segments.length === 1 && segments[0].type === "link" && segments[0].href === content;
  }
  return !/[\r\n]/.test(content) && (content.startsWith("/") || content.startsWith("cos://"));
}

export function getPublicDownloadLinks(file: { filePath: string; fileUrl?: string | null } | null | undefined, isPaid: boolean) {
  const content = getDownloadLinkContent(file);
  if (isPaid || !file || content !== file.filePath.replace(/\r\n?/g, "\n")) return [];

  const segments = linkifyDownloadLinkContent(content);
  if (segments.some(segment => segment.type === "text" && segment.text.trim() !== "")) return [];
  const links = segments.flatMap(segment => segment.type === "link" ? [segment.href] : []);
  const allPublic = links.every(href => {
    try {
      const url = new URL(href);
      if (url.protocol !== "https:" || url.username || url.password) return false;
      return !Array.from(url.searchParams.keys()).some(key => /^(?:q-(?:ak|key-time|sign-algorithm|sign-time|signature|header-list|url-param-list)|x-amz-(?:credential|date|expires|security-token|signature)|x-goog-(?:credential|date|expires|signature)|signature|sig|token|access[_-]?token|access[_-]?key|auth[_-]?key|expires|policy|key-pair-id)$/i.test(key));
    } catch {
      return false;
    }
  });
  return allPublic ? links : [];
}

export function resolveSoftwareDownloadCtaHref(input: {
  hasDownloadLink: boolean;
  showDownloadLinkArea: boolean;
  isDownloadPaid: boolean;
  hasDownloadPurchase: boolean;
  protectedDownloadHref: string;
  publicDownloadHref?: string | null;
}) {
  if (input.isDownloadPaid && !input.hasDownloadPurchase) return "#download-purchase";
  if (input.publicDownloadHref) return input.publicDownloadHref;
  if (input.hasDownloadLink && input.showDownloadLinkArea) return "#download-links";
  return input.protectedDownloadHref;
}
