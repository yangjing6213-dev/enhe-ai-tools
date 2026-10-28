import { QRCodeSVG } from "qrcode.react";
import type { Locale } from "@/lib/dictionaries";
import { absoluteUrl } from "@/lib/seo";
import styles from "./product-sharing.module.css";

export function SiteQrCode({ locale, size = 144, className }: { locale: Locale; size?: number; className?: string }) {
  const label = locale === "en" ? "Scan to bookmark this site" : "扫码收藏网站";
  return (
    <figure className={[styles.siteQr, className].filter(Boolean).join(" ")}>
      <QRCodeSVG value={absoluteUrl("/")} size={size} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" role="img" aria-label={label} />
      <figcaption>{label}</figcaption>
    </figure>
  );
}
