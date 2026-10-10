"use client";

import { Bell, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";

import type { Locale } from "@/lib/dictionaries";

export function SiteFloatingActions({
  locale,
  isAuthenticated,
}: {
  locale: Locale;
  isAuthenticated: boolean;
}) {
  const [hasUnread, setHasUnread] = useState(false);
  const isEnglish = locale === "en";

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    void fetch("/api/user/notifications/unread-status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return false;
        const payload = (await response.json()) as { hasUnread?: unknown };
        return payload.hasUnread === true;
      })
      .then((unread) => {
        if (active) setHasUnread(unread);
      })
      .catch(() => {
        if (active) setHasUnread(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  return (
    <nav
      className="site-floating-actions"
      aria-label={isEnglish ? "Account shortcuts" : "个人中心快捷入口"}
    >
      <a
        className="site-floating-action"
        href={isEnglish ? "/en/user#orders" : "/user#orders"}
        aria-label={isEnglish ? "View purchase orders" : "查看购买订单"}
        title={isEnglish ? "View purchase orders" : "查看购买订单"}
      >
        <ShoppingCart size={20} strokeWidth={2} aria-hidden="true" />
      </a>
      <a
        className="site-floating-action"
        href={isEnglish ? "/en/user#notifications" : "/user#notifications"}
        aria-label={
          isEnglish
            ? hasUnread
              ? "Inbox, unread messages"
              : "Inbox"
            : hasUnread
              ? "站内消息，有未读消息"
              : "站内消息"
        }
        title={isEnglish ? "Inbox" : "站内消息"}
      >
        <Bell size={20} strokeWidth={2} aria-hidden="true" />
        {hasUnread ? <span className="site-floating-action-unread" aria-hidden="true" /> : null}
      </a>
    </nav>
  );
}
