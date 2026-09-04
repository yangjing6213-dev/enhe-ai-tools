"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  labels: {
    like: string;
    favorite: string;
    share: string;
    copyLink: string;
    backToTop: string;
    loginRequired: string;
  };
};

export function AiNewsInteractions({ slug, labels }: Props) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/ai-news/${slug}/view`, { method: "POST" }).catch(() => undefined);
  }, [slug]);

  async function post(path: "like" | "favorite") {
    const response = await fetch(`/api/ai-news/${slug}/${path}`, { method: "POST" });
    if (response.status === 401) {
      setMessage(labels.loginRequired);
      return;
    }
    setMessage(response.ok ? (path === "like" ? labels.like : labels.favorite) : labels.loginRequired);
  }

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setMessage(labels.copyLink);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: document.title, url: window.location.href });
      return;
    }
    await copy();
  }

  const actions: Array<[string, () => void | Promise<void>]> = [
    [labels.like, () => post("like")],
    [labels.favorite, () => post("favorite")],
    [labels.share, share],
    [labels.copyLink, copy],
    [labels.backToTop, () => window.scrollTo({ top: 0, behavior: "smooth" })]
  ];

  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
      {actions.map(([label, action]) => (
        <button
          key={label}
          type="button"
          onClick={action}
          className={cn(
            "rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
          )}
        >
          {label}
        </button>
      ))}
      {message ? <span className="text-sm text-[var(--marketing-accent)]">{message}</span> : null}
    </div>
  );
}
