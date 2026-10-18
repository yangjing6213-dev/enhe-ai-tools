"use client";

import { Bell, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/lib/dictionaries";
import { getDictionary } from "@/lib/dictionaries";
import { formatCurrency } from "@/lib/utils";

type QuickAccessOrder = {
  id: string;
  orderNo: string;
  itemName: string;
  amount: string;
  orderStatus: string;
  createdAt: string;
};

type QuickAccessNotification = {
  id: string;
  title: string;
  content: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

type QuickAccessData = {
  hasUnread: boolean;
  orders: QuickAccessOrder[];
  notifications: QuickAccessNotification[];
};

type OpenPanel = "cart" | "inbox" | null;

export function SiteFloatingActions({
  locale,
  isAuthenticated,
}: {
  locale: Locale;
  isAuthenticated: boolean;
}) {
  const [hasUnread, setHasUnread] = useState(false);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [data, setData] = useState<QuickAccessData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const isEnglish = locale === "en";
  const userHref = isEnglish ? "/en/user" : "/user";
  const loginHref = isEnglish ? "/en/login" : "/login";
  const dictionary = getDictionary(locale);

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

  useEffect(() => {
    if (openPanel === null || !isAuthenticated) return;

    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setSessionExpired(false);
    void fetch("/api/user/quick-access?locale=" + locale, { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setSessionExpired(true);
          return null;
        }
        if (!response.ok) throw new Error("quick access unavailable");
        return (await response.json()) as QuickAccessData;
      })
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setHasUnread(result.hasUnread);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [openPanel, isAuthenticated, locale, refreshKey]);

  useEffect(() => {
    if (openPanel === null) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenPanel(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPanel(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openPanel]);

  const togglePanel = (panel: Exclude<OpenPanel, null>) => {
    setOpenPanel((current) => current === panel ? null : panel);
  };
  const closePanel = () => setOpenPanel(null);
  const orderStatus = (status: string) =>
    dictionary.userCenter.status[status as keyof typeof dictionary.userCenter.status] ?? status;
  const dateLabel = (value: string) =>
    new Date(value).toLocaleDateString(isEnglish ? "en-US" : "zh-CN");

  const renderPanelContents = (panel: Exclude<OpenPanel, null>) => {
    if (!isAuthenticated) {
      return (
        <div className="site-floating-action-state">
          <p>{isEnglish ? "Sign in to view your orders and messages." : "登录后即可查看你的订单和站内消息。"}</p>
          <a href={loginHref} onClick={closePanel}>
            {isEnglish ? "Sign in" : "登录"}
          </a>
        </div>
      );
    }
    if (sessionExpired) {
      return (
        <div className="site-floating-action-state">
          <p>{isEnglish ? "Your session has expired. Sign in again to continue." : "登录状态已过期，请重新登录后继续查看。"}</p>
          <a href={loginHref} onClick={closePanel}>
            {isEnglish ? "Sign in again" : "重新登录"}
          </a>
        </div>
      );
    }
    if (loading) {
      return <p className="site-floating-action-state" role="status">{isEnglish ? "Loading..." : "正在加载…"}</p>;
    }
    if (loadFailed) {
      return (
        <div className="site-floating-action-state">
          <p>{isEnglish ? "Could not load this information." : "暂时无法加载这些信息。"}</p>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>
            {isEnglish ? "Try again" : "重试"}
          </button>
        </div>
      );
    }
    if (panel === "cart") {
      return data?.orders.length ? (
        <ul className="site-floating-action-list">
          {data.orders.map((order) => (
            <li key={order.id}>
              <a className="site-floating-order" href={"/orders/" + order.id} onClick={closePanel}>
                <span className="site-floating-order-top">
                  <span>{order.orderNo}</span>
                  <strong>{formatCurrency(order.amount)}</strong>
                </span>
                <span className="site-floating-order-name">{order.itemName}</span>
                <span className="site-floating-order-meta">{orderStatus(order.orderStatus)} · {dateLabel(order.createdAt)}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="site-floating-action-state">{isEnglish ? "No orders yet." : dictionary.userCenter.noOrders}</p>
      );
    }

    return data?.notifications.length ? (
      <ul className="site-floating-action-list">
        {data.notifications.map((notification) => (
          <li key={notification.id} className={notification.isRead ? "" : "site-floating-notification-unread"}>
            <article className="site-floating-notification">
              <strong>{notification.title}</strong>
              <p>{notification.content}</p>
              <time dateTime={notification.createdAt}>{dateLabel(notification.createdAt)}</time>
              {notification.linkUrl ? (
                <a href={notification.linkUrl} onClick={closePanel}>
                  {isEnglish ? "View details" : dictionary.notifications.viewDetails}
                </a>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
    ) : (
      <p className="site-floating-action-state">{isEnglish ? "No messages yet." : dictionary.notifications.empty}</p>
    );
  };

  return (
    <div
      ref={rootRef}
      className="site-floating-actions"
      role="region"
      aria-label={isEnglish ? "Account shortcuts" : "个人中心快捷入口"}
    >
      <div className="site-floating-action-container">
        <button
          className="site-floating-action customer-support-launcher shadow-[0_14px_38px_rgba(0,8,14,0.42)] backdrop-blur-xl transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--marketing-accent)]"
          type="button"
          aria-label={isEnglish ? "View purchase orders" : "查看购买订单"}
          aria-controls="site-floating-cart-panel"
          aria-haspopup="dialog"
          aria-expanded={openPanel === "cart"}
          title={isEnglish ? "View purchase orders" : "查看购买订单"}
          onClick={() => togglePanel("cart")}
        >
          <ShoppingCart size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        {openPanel === "cart" ? (
          <section
            className="site-floating-action-panel"
            id="site-floating-cart-panel"
            role="dialog"
            aria-labelledby="site-floating-cart-title"
          >
            <header className="site-floating-action-panel-header">
              <h2 id="site-floating-cart-title">{isEnglish ? "Recent orders" : "最近订单"}</h2>
              <button className="site-floating-action-close" type="button" aria-label={isEnglish ? "Close window" : "关闭窗口"} onClick={closePanel}>
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="site-floating-action-panel-content">{renderPanelContents("cart")}</div>
            <a className="site-floating-action-panel-footer" href={userHref + "#orders"} onClick={closePanel}>
              {isEnglish ? "View all orders" : "查看全部订单"}
            </a>
          </section>
        ) : null}
      </div>

      <div className="site-floating-action-container">
        <button
          className="site-floating-action customer-support-launcher shadow-[0_14px_38px_rgba(0,8,14,0.42)] backdrop-blur-xl transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--marketing-accent)]"
          type="button"
          aria-label={
            isEnglish
              ? hasUnread ? "Inbox, unread messages" : "Inbox"
              : hasUnread ? "站内消息，有未读消息" : "站内消息"
          }
          aria-controls="site-floating-inbox-panel"
          aria-haspopup="dialog"
          aria-expanded={openPanel === "inbox"}
          title={isEnglish ? "Inbox" : "站内消息"}
          onClick={() => togglePanel("inbox")}
        >
          <Bell size={20} strokeWidth={2} aria-hidden="true" />
          {hasUnread ? <span className="site-floating-action-unread" aria-hidden="true" /> : null}
        </button>
        {openPanel === "inbox" ? (
          <section
            className="site-floating-action-panel"
            id="site-floating-inbox-panel"
            role="dialog"
            aria-labelledby="site-floating-inbox-title"
          >
            <header className="site-floating-action-panel-header">
              <h2 id="site-floating-inbox-title">{isEnglish ? "Messages" : "站内消息"}</h2>
              <button className="site-floating-action-close" type="button" aria-label={isEnglish ? "Close window" : "关闭窗口"} onClick={closePanel}>
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="site-floating-action-panel-content">{renderPanelContents("inbox")}</div>
            <a className="site-floating-action-panel-footer" href={userHref + "#notifications"} onClick={closePanel}>
              {isEnglish ? "View all messages" : "查看全部消息"}
            </a>
          </section>
        ) : null}
      </div>
    </div>
  );
}
