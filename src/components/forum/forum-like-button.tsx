"use client";

import { Heart } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toggleForumLikeAction } from "@/app/forum/actions";
import { buildLocalePath } from "@/lib/seo";

export function ForumLikeButton({ locale, postId, replyId, count, isLiked = false, isAuthenticated, returnTo = "/forum", variant = "text", onSaved }: {
  locale: "zh" | "en";
  postId?: string;
  replyId?: string;
  count: number;
  isLiked?: boolean;
  isAuthenticated: boolean;
  returnTo?: string;
  variant?: "text" | "icon";
  onSaved?: (button: HTMLButtonElement) => void;
}) {
  const [state, setState] = useState({ count, liked: isLiked });
  const [pulse, setPulse] = useState(0);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => setState({ count, liked: isLiked }), [count, isLiked]);
  const label = locale === "en" ? "Like" : "喜欢";
  const iconOnly = variant === "icon";
  const className = iconOnly ? "forum-action forum-action--like" : "forum-like-button";
  const content = <><span className={iconOnly ? "forum-action-icon" : "forum-like-heart"} key={pulse} data-animated={!iconOnly && pulse > 0 || undefined}><Heart size={iconOnly ? 21 : 18} fill={state.liked && !iconOnly ? "currentColor" : "none"} aria-hidden="true" /></span><span className={iconOnly ? "forum-action-count" : undefined} aria-hidden={iconOnly || undefined}>{iconOnly ? state.count : `${label} ${state.count}`}</span></>;

  if (!isAuthenticated) return <a className={className} data-forum-action={iconOnly ? "like" : undefined} href={`${buildLocalePath("/login", locale)}?returnTo=${encodeURIComponent(buildLocalePath(returnTo, locale))}`} aria-label={locale === "en" ? `Sign in to like: ${count}` : `登录后喜欢：${count}`} title={label}>{content}</a>;
  return <span className={`forum-like-control${iconOnly ? " forum-like-control--icon" : ""}`}>
    <button type="button" className={className} data-forum-action={iconOnly ? "like" : undefined} aria-pressed={state.liked} disabled={pending} aria-label={`${label}${iconOnly && locale !== "en" ? "：" : ": "}${state.count}`} title={label} onClick={(event) => {
      const button = event.currentTarget;
      setError("");
      startTransition(async () => {
        const data = new FormData();
        if (postId) data.set("postId", postId);
        if (replyId) data.set("replyId", replyId);
        try {
          setState(await toggleForumLikeAction(data));
          setPulse((value) => value + 1);
          onSaved?.(button);
        }
        catch { setError(locale === "en" ? "Could not save. Please try again." : "未能保存，请稍后再试。"); }
      });
    }}>{content}</button>
    {error ? <span className="forum-like-error" role="alert">{error}</span> : null}
  </span>;
}
