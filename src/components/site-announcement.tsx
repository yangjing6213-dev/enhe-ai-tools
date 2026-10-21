"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { SiteAnnouncementConfig } from "@/lib/site-announcement";

const dismissalKey = "enhe-announcement-dismissed";
let dismissedInMemory = false;

export function SiteAnnouncement({ notice, locale }: { notice: SiteAnnouncementConfig; locale: "zh" | "en" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let dismissed = dismissedInMemory;
    try {
      dismissed = dismissed || sessionStorage.getItem(dismissalKey) === "1";
    } catch {
      // Closing still works for this page when browser storage is unavailable.
    }
    setVisible(!dismissed);
  }, []);

  if (!notice.enabled || !visible) return null;
  const text = locale === "en" ? notice.enText : notice.zhText;
  const href = locale === "en" ? notice.enHref : notice.zhHref;

  function dismiss() {
    dismissedInMemory = true;
    setVisible(false);
    try {
      sessionStorage.setItem(dismissalKey, "1");
    } catch {
      // Keep the in-memory dismissal even when storage is blocked.
    }
  }

  return (
    <aside className="site-announcement" aria-label={locale === "en" ? "Site announcement" : "网站通知"}>
      <div className="site-announcement-inner">
        <div className="site-announcement-message">
          {href ? <Link href={href} prefetch={false}>{text}</Link> : <span>{text}</span>}
        </div>
        <button type="button" onClick={dismiss} aria-label={locale === "en" ? "Dismiss announcement" : "关闭通知"}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
