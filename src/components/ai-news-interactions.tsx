"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Bookmark, Copy, Heart, Share2 } from "lucide-react";
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
    articleSupportLabel: string;
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

  const actions = [
    { label: labels.like, Icon: Heart, onClick: () => post("like") },
    { label: labels.favorite, Icon: Bookmark, onClick: () => post("favorite") },
    { label: labels.share, Icon: Share2, onClick: share },
    { label: labels.copyLink, Icon: Copy, onClick: copy },
    {
      label: labels.backToTop,
      Icon: ArrowUp,
      onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    },
  ];

  return (
    <div
      className="ai-news-interactions glass flex flex-wrap items-center gap-2 rounded-2xl p-3"
      role="group"
      aria-label={labels.articleSupportLabel}
    >
      {actions.map(({ label, Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          aria-label={label}
          title={label}
          className={cn(
            "ai-news-action ai-news-icon-action rounded-full border"
          )}
        >
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
      ))}
      {message ? (
        <span className="px-2 text-sm text-[var(--marketing-accent)]" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
