import { QRCodeSVG } from "qrcode.react";
import type { Locale } from "@/lib/dictionaries";
import { absoluteUrl } from "@/lib/seo";
import styles from "./product-sharing.module.css";

export function SiteQrCode({ locale }: { locale: Locale }) {
  const label = locale === "en" ? "Scan to visit the homepage" : "扫码进入网站首页";
  return (
    <figure className={styles.siteQr}>
      <QRCodeSVG value={absoluteUrl("/")} size={144} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" role="img" aria-label={label} />
      <figcaption>{label}</figcaption>
    </figure>
  );
}
