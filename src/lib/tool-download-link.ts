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
  return content.startsWith("/") || content.startsWith("cos://") || /^https?:\/\//i.test(content);
}

export function canOpenPublicDownloadEntry(input: {
  content: string;
  isDownloadPaid: boolean;
  hasDownloadPurchase: boolean;
}) {
  if (input.isDownloadPaid) return false;
  return /^https?:\/\//i.test(input.content);
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
