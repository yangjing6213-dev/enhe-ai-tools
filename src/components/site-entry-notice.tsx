"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/dictionaries";
import { companyProfile } from "@/lib/company-profile";
import type { SiteEntryNoticeConfig } from "@/lib/site-entry-notice";
import { SiteQrCode } from "@/components/site-qr-code";
import styles from "./site-entry-notice.module.css";

const dismissedKey = "enhe-entry-notice-dismissed-v1";

export function SiteEntryNotice({ locale, config }: { locale: Locale; config: SiteEntryNoticeConfig }) {
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const english = locale === "en";
  const title = english ? config.enTitle : config.zhTitle;
  const paragraphs = (english ? config.enBody : config.zhBody).split(/\n\s*\n/u).filter(Boolean);
  const ending = english ? config.enEnding : config.zhEnding;

  useEffect(() => {
    if (!config.enabled) {
      setVisible(false);
      return;
    }
    try {
      if (window.localStorage.getItem(dismissedKey) === String(config.version)) {
        setVisible(false);
        return;
      }
    } catch {
      // Show the notice for this page when browser storage is unavailable.
    }
    setVisible(true);
  }, [config.enabled, config.version]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (visible && config.enabled && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    else if ((!visible || !config.enabled) && dialog.open) dialog.close();
  }, [visible, config.enabled]);

  function dismiss() {
    try {
      window.localStorage.setItem(dismissedKey, String(config.version));
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

  if (!config.enabled || !visible) return null;

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
          {title}
        </h2>
        <div className={styles.message}>
          {paragraphs.map((paragraph, index) => (
            <p key={paragraph} className={index === 1 || index === 3 ? styles.warning : undefined}>
              {paragraph}
            </p>
          ))}
          {ending ? <p>{ending} <a href={companyProfile.email.href}>{companyProfile.email.value}</a></p> : null}
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
