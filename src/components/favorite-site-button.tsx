"use client";

import { Star } from "lucide-react";
import { useState } from "react";

export function FavoriteSiteButton({ locale, className, showLabel = false }: { locale: "zh" | "en"; className?: string; showLabel?: boolean }) {
  const [message, setMessage] = useState("");
  const english = locale === "en";

  function addFavorite() {
    try {
      const legacyExternal = window.external as typeof window.external & { AddFavorite?: (url: string, title: string) => void };
      if (legacyExternal.AddFavorite) {
        legacyExternal.AddFavorite(window.location.href, document.title);
        setMessage(english ? "Added to favorites." : "已添加到收藏夹。");
        return;
      }
    } catch {
      // Current browsers generally block websites from changing browser bookmarks.
    }
    setMessage(english
      ? "Your browser blocks automatic bookmarks. Use Ctrl+D (⌘+D on Mac), or the browser menu on mobile."
      : "浏览器不允许网页自动添加书签。电脑可按 Ctrl+D（Mac 按 ⌘+D），手机请在浏览器菜单中选择“添加书签”。");
  }

  return (
    <span className="favorite-site-action">
      <button type="button" className={className} onClick={addFavorite} aria-label={english ? "Bookmark this site" : "收藏本站"}>
        <Star aria-hidden="true" size={20} />
        {showLabel ? <span>{english ? "Bookmark this site" : "收藏本站"}</span> : null}
      </button>
      <span className="favorite-site-feedback" role="status" aria-live="polite">{message}</span>
    </span>
  );
}
