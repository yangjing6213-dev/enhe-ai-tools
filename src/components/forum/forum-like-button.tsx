"use client";

import { Heart } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toggleForumLikeAction } from "@/app/forum/actions";
import { buildLocalePath } from "@/lib/seo";

export function ForumLikeButton({ locale, postId, replyId, count, isLiked = false, isAuthenticated, returnTo = "/forum" }: {
  locale: "zh" | "en";
  postId?: string;
  replyId?: string;
  count: number;
  isLiked?: boolean;
  isAuthenticated: boolean;
  returnTo?: string;
}) {
  const [state, setState] = useState({ count, liked: isLiked });
  const [pulse, setPulse] = useState(0);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => setState({ count, liked: isLiked }), [count, isLiked]);
  const label = locale === "en" ? "Like" : "喜欢";
  const content = <><span className="forum-like-heart" key={pulse} data-animated={pulse > 0 || undefined}><Heart size={18} fill={state.liked ? "currentColor" : "none"} aria-hidden="true" /></span><span>{label} {state.count}</span></>;

  if (!isAuthenticated) return <a className="forum-like-button" href={`${buildLocalePath("/login", locale)}?returnTo=${encodeURIComponent(buildLocalePath(returnTo, locale))}`} aria-label={locale === "en" ? `Sign in to like: ${count}` : `登录后喜欢：${count}`}>{content}</a>;
  return <span className="forum-like-control">
    <button type="button" className="forum-like-button" aria-pressed={state.liked} disabled={pending} aria-label={`${label}: ${state.count}`} onClick={() => {
      setPulse((value) => value + 1);
      setError("");
      startTransition(async () => {
        const data = new FormData();
        if (postId) data.set("postId", postId);
        if (replyId) data.set("replyId", replyId);
        try { setState(await toggleForumLikeAction(data)); }
        catch { setError(locale === "en" ? "Could not save. Please try again." : "未能保存，请稍后再试。"); }
      });
    }}>{content}</button>
    {error ? <span className="forum-like-error" role="alert">{error}</span> : null}
  </span>;
}
