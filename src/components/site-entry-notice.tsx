"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/dictionaries";
import { companyProfile } from "@/lib/company-profile";
import { isSiteEntryNoticeHomePath, SITE_ENTRY_NOTICE_SESSION_KEY, type SiteEntryNoticeConfig } from "@/lib/site-entry-notice";
import { SiteQrCode } from "@/components/site-qr-code";
import { FavoriteSiteButton } from "@/components/favorite-site-button";
import styles from "./site-entry-notice.module.css";

export function SiteEntryNotice({ locale, config }: { locale: Locale; config: SiteEntryNoticeConfig }) {
  const [visible, setVisible] = useState(false);
  const e2eDismissed = useRef<boolean | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pathname = usePathname();
  const isHomePath = isSiteEntryNoticeHomePath(pathname ?? "");
  const english = locale === "en";
  const title = english ? config.enTitle : config.zhTitle;
  const paragraphs = (english ? config.enBody : config.zhBody).split(/\n\s*\n/u).filter(Boolean);
  const ending = english ? config.enEnding : config.zhEnding;

  useEffect(() => {
    if (!config.enabled || !isHomePath) {
      setVisible(false);
      return;
    }
    if (e2eDismissed.current === null) {
      e2eDismissed.current = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) && window.localStorage.getItem("enhe-e2e-entry-notice-dismissed-v1") === "1";
    }
    let dismissedInThisSession = false;
    try {
      dismissedInThisSession = window.sessionStorage.getItem(SITE_ENTRY_NOTICE_SESSION_KEY) === "1";
    } catch {
      // Treat blocked storage as a fresh visit instead of preventing the page from rendering.
    }
    setVisible(!e2eDismissed.current && !dismissedInThisSession);
  }, [config.enabled, config.version, isHomePath]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (visible && config.enabled && !dialog.open && typeof dialog.showModal === "function") {
      dialog.showModal();
      titleRef.current?.focus({ preventScroll: true });
    }
    else if ((!visible || !config.enabled) && dialog.open) dialog.close();
  }, [visible, config.enabled]);

  function dismiss() {
    try {
      window.sessionStorage.setItem(SITE_ENTRY_NOTICE_SESSION_KEY, "1");
    } catch {
      // The notice can still close when session storage is unavailable.
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
        <h2 ref={titleRef} tabIndex={-1} id="site-entry-notice-title" className={styles.title}>
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
        <div className={styles.favoriteWrap}>
          <FavoriteSiteButton locale={locale} showLabel className={styles.favorite} />
        </div>
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={closeDialog}
        aria-label={english ? "Close announcement" : "关闭公告"}
      >
        <X aria-hidden="true" size={18} />
        <span>{english ? "Got it" : "我知道了"}</span>
      </button>
    </dialog>
  );
}
