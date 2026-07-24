"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getBackNavigationParentHref, shouldShowBackNavigation, shouldUseBrowserHistory } from "@/lib/back-navigation";
import { cn } from "@/lib/utils";

type BackNavigationBarProps = {
  locale: "zh" | "en";
};

let clientPathStack: string[] = [];
let pendingHistoryTraversal = false;
let pendingParentFallback = false;

export function BackNavigationBar({ locale }: BackNavigationBarProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const parentHref = getBackNavigationParentHref(pathname);
  const visible = shouldShowBackNavigation(pathname);

  useEffect(() => {
    const handlePopState = () => {
      pendingHistoryTraversal = true;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const currentPath = clientPathStack.at(-1);
    if (!currentPath) {
      clientPathStack = [pathname];
      return;
    }
    if (currentPath === pathname) return;

    if (pendingParentFallback) {
      clientPathStack = [pathname];
      pendingParentFallback = false;
      pendingHistoryTraversal = false;
      return;
    }

    if (pendingHistoryTraversal && clientPathStack.at(-2) === pathname) {
      clientPathStack.pop();
    } else {
      clientPathStack.push(pathname);
    }
    pendingHistoryTraversal = false;
  }, [pathname]);

  if (!visible) return null;

  const label = locale === "en" ? "Back" : "返回上一页";

  return (
    <nav className="site-back-nav" aria-label={locale === "en" ? "Page back navigation" : "页面返回导航"}>
      <button
        type="button"
        className={cn("site-back-nav-button cursor-target")}
        onClick={() => {
          if (
            shouldUseBrowserHistory({
              currentOrigin: window.location.origin,
              hasClientHistory: clientPathStack.length > 1,
              historyLength: window.history.length,
              referrer: document.referrer,
            })
          ) {
            router.back();
            return;
          }
          pendingParentFallback = true;
          router.replace(parentHref);
        }}
      >
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
      </button>
    </nav>
  );
}
