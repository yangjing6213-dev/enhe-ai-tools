export function canShowDownloadLinkArea(input: { hasDownloadLink: boolean; isDownloadPaid: boolean; hasDownloadPurchase: boolean }) {
  if (!input.hasDownloadLink) return false;
  return !input.isDownloadPaid || input.hasDownloadPurchase;
}

export function getDownloadLinkContent(file?: { filePath?: string | null; fileUrl?: string | null } | null) {
  return (file?.fileUrl ?? file?.filePath ?? "").trim();
}

export function canOpenProtectedDownloadEntry(content: string) {
  return content.startsWith("/") || content.startsWith("cos://") || /^https?:\/\//i.test(content);
}

export function canOpenPublicDownloadEntry(input: {
  content: string;
  isDownloadPaid: boolean;
  hasDownloadPurchase: boolean;
}) {
  if (input.isDownloadPaid && !input.hasDownloadPurchase) return false;
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
  if (input.publicDownloadHref) return input.publicDownloadHref;
  if (input.hasDownloadLink && input.showDownloadLinkArea) return "#download-links";
  if (input.isDownloadPaid && !input.hasDownloadPurchase) return "#download-purchase";
  return input.protectedDownloadHref;
}
