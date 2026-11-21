import { QRCodeSVG } from "qrcode.react";
import type { Locale } from "@/lib/dictionaries";
import { absoluteUrl } from "@/lib/seo";
import { ProductShareActions } from "./product-share-actions";
import styles from "./product-sharing.module.css";

export function ProductShareCard({ locale, title, path }: { locale: Locale; title: string; path: string }) {
  const url = absoluteUrl(path);
  const english = locale === "en";

  return (
    <section className={`surface-panel ${styles.card}`} aria-label={english ? "Share This Page" : "分享此页面"}>
      <h2>{english ? "Share This Page" : "分享此页面"}</h2>
      <div className={styles.content}>
        <QRCodeSVG value={url} size={160} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" role="img" aria-label={english ? `QR code for ${title}` : `${title}的分享二维码`} />
        <div className={styles.details}>
        <p>{english ? "Scan the QR code to view this page, or copy its link to share." : "扫码查看此页面，或复制链接分享给朋友。"}</p>
          <ProductShareActions locale={locale} url={url} />
        </div>
      </div>
    </section>
  );
}
