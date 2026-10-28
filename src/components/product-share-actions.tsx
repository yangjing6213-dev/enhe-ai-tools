"use client";

import { useState } from "react";
import type { Locale } from "@/lib/dictionaries";
import styles from "./product-sharing.module.css";

export async function copyProductLink(url: string, clipboard: Pick<Clipboard, "writeText"> | undefined): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function ProductShareActions({ locale, url }: { locale: Locale; url: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const english = locale === "en";

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.copyButton} onClick={async () => setStatus(await copyProductLink(url, navigator.clipboard) ? "copied" : "manual")}>
        {english ? "Copy product link" : "复制产品链接"}
      </button>
      <p className={styles.feedback} role="status" aria-live="polite">
        {status === "copied" ? (english ? "Link copied. You can paste it to share." : "链接已复制，可以粘贴分享。") : status === "manual" ? (english ? "Automatic copying is unavailable. Select and copy the link below." : "浏览器未允许自动复制，请选中下方链接手动复制。") : ""}
      </p>
      {status === "manual" ? <input className={styles.manualLink} aria-label={english ? "Product link" : "产品链接"} value={url} readOnly onFocus={(event) => event.currentTarget.select()} /> : null}
    </div>
  );
}
