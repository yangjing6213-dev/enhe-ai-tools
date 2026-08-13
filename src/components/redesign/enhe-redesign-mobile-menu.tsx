"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RedesignAccount, RedesignNavItem } from "./types";

export function EnheRedesignMobileMenu({
  menuId,
  triggerLabel,
  closeLabel,
  navItems,
  account,
}: {
  menuId: string;
  triggerLabel: string;
  closeLabel: string;
  navItems: ReadonlyArray<RedesignNavItem>;
  account: RedesignAccount;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const mountedTrigger = triggerRef.current;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      "a, button, [tabindex]:not([tabindex='-1'])",
    );
    firstFocusable?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "a, button, [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const returnTarget = previouslyFocusedElement.current ?? mountedTrigger;
      requestAnimationFrame(() => returnTarget?.focus());
    };
  }, [close, open]);

  const openMenu = () => {
    previouslyFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  };

  return (
    <div className="redesign-mobile-menu-root">
      <button
        ref={triggerRef}
        type="button"
        className="redesign-menu-trigger"
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={open ? close : openMenu}
      >
        <span className="redesign-menu-bars" aria-hidden="true" />
      </button>
      {open ? (
        <>
          <button type="button" className="redesign-menu-overlay" aria-label={closeLabel} onClick={close} />
          <aside ref={panelRef} id={menuId} className="redesign-mobile-drawer" aria-label={triggerLabel}>
            <button type="button" className="redesign-drawer-close" aria-label={closeLabel} onClick={close}>
              <span aria-hidden="true">×</span>
            </button>
            <nav className="redesign-mobile-nav" aria-label={triggerLabel}>
              {navItems.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.kind === "search" ? <span className="redesign-search-icon" aria-hidden="true" /> : null}
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
            <div className="redesign-mobile-account">
              {account.status === "guest" ? (
                <a href={account.loginHref}>{account.loginLabel}</a>
              ) : (
                <>
                  <span className="redesign-mobile-account-label">{account.displayName}</span>
                  <a href={account.userHref}>{account.userLabel}</a>
                  {account.isAdmin ? <a href={account.adminHref}>{account.adminLabel}</a> : null}
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
