"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/dictionaries";
import { companyProfile } from "@/lib/company-profile";
import { SiteQrCode } from "@/components/site-qr-code";
import styles from "./site-entry-notice.module.css";

const dismissedKey = "enhe-entry-notice-dismissed-v1";

const NOTICE_COPY = {
  zh: [
    "感谢您访问 ENHE AI 官网。",
    "本站部分自制软件可能尚未上架应用市场，部分安全软件可能出现误报。介意请勿下载；下载前请核对产品页面说明。",
    "本站资源包含 AI 开发应用、Skills、虚拟服务等；各产品的审核状态、功能与运行要求以对应产品页面为准。",
    "数字商品下载或服务开通后通常视为已交付；已开通、已下载或使用的数字服务通常不支持无理由退款。未交付、重复付款、质量问题等情形，按法律规定及本站退款规则处理。",
    "请认真阅读系统与配置要求，确认设备满足要求后再付款。",
  ],
  en: [
    "Thank you for visiting the ENHE AI website.",
    "Some software made by ENHE AI may not be listed in app stores, and security software may report a false positive. If this is a concern, please do not download it; review the product page first.",
    "The site offers AI development apps, Skills, and virtual services. Review status, features, and system requirements are shown on each product page.",
    "A digital product download or service activation is generally treated as delivery. Activated, downloaded, or used digital services are generally not eligible for no-reason refunds. Non-delivery, duplicate payment, quality issues, and other cases are handled under applicable law and the published refund rules.",
    "Read the system requirements carefully and confirm your device meets them before paying.",
  ],
} as const;

export function SiteEntryNotice({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const english = locale === "en";

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(dismissedKey) === "1") return;
    } catch {
      // Show the notice for this page when browser storage is unavailable.
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (visible && dialog && !dialog.open && typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  }, [visible]);

  function dismiss() {
    try {
      window.sessionStorage.setItem(dismissedKey, "1");
    } catch {
      // The notice can still be dismissed for the current page.
    }
    setVisible(false);
  }

  function closeDialog() {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-modal="true"
      aria-labelledby="site-entry-notice-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={dismiss}
    >
      <div className={styles.card}>
        <h2 id="site-entry-notice-title" className={styles.title}>
          <Bell aria-hidden="true" size={22} />
          {english ? "Latest Site Announcement" : "本站最新公告通知"}
        </h2>
        <div className={styles.message}>
          {NOTICE_COPY[english ? "en" : "zh"].map((paragraph, index) => (
            <p key={paragraph} className={index === 1 || index === 3 ? styles.warning : undefined}>
              {paragraph}
            </p>
          ))}
          <p>
            {english ? "Questions? Contact " : "如有任何疑问，请联系客服："}
            <a href={companyProfile.email.href}>{companyProfile.email.value}</a>
          </p>
        </div>
        <SiteQrCode locale={locale} size={112} className={styles.qr} />
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={closeDialog}
        aria-label={english ? "Close announcement" : "关闭公告"}
        autoFocus
      >
        <X aria-hidden="true" size={24} />
      </button>
    </dialog>
  );
}
