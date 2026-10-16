"use client";

import { Bookmark, MessageSquare, Repeat2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { recordForumShareAction, setForumBookmarkAction } from "@/app/forum/actions";
import type { Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import { ClickSpark, type ClickSparkHandle } from "./click-spark";
import { ForumLikeButton } from "./forum-like-button";

type ShareNavigator = {
  userAgent?: string;
  maxTouchPoints?: number;
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Pick<Clipboard, "writeText">;
};

export async function shareForumPostLink(topic: { url: string; title: string }, browser: ShareNavigator) {
  const mobile = /Android|iPhone|iPad|iPod/i.test(browser.userAgent ?? "")
    || (/Macintosh/i.test(browser.userAgent ?? "") && (browser.maxTouchPoints ?? 0) > 1);
  if (mobile && browser.share) {
    try {
      await browser.share(topic);
      return "shared" as const;
    } catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return "cancelled" as const;
    }
  }
  try {
    if (browser.clipboard) {
      await browser.clipboard.writeText(topic.url);
      return "copied" as const;
    }
  } catch {
    // Keep the URL available for manual selection when clipboard permission is denied.
  }
  return "manual" as const;
}

export function ForumPostActions({ locale, postId, title, replyCount, shareCount, likeCount, isLiked, isBookmarked, isAuthenticated, replyHref }: {
  locale: Locale;
  postId: string;
  title: string;
  replyCount: number;
  shareCount: number;
  likeCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isAuthenticated: boolean;
  replyHref: string;
}) {
  const [shares, setShares] = useState(shareCount);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [shareMessage, setShareMessage] = useState("");
  const [shareError, setShareError] = useState("");
  const [bookmarkError, setBookmarkError] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [sharePending, startShare] = useTransition();
  const [bookmarkPending, startBookmark] = useTransition();
  const spark = useRef<ClickSparkHandle>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  useEffect(() => setShares(shareCount), [shareCount]);
  useEffect(() => setBookmarked(isBookmarked), [isBookmarked]);
  useEffect(() => { if (manualUrl) linkInput.current?.select(); }, [manualUrl]);

  const english = locale === "en";
  const topicPath = buildLocalePath(`/forum/${postId}`, locale);
  const loginHref = `${buildLocalePath("/login", locale)}?returnTo=${encodeURIComponent(topicPath)}`;
  const replyLabel = `${english ? "Replies: " : "回复："}${replyCount}`;
  const shareLabel = `${english ? "Share: " : "转发："}${shares}`;
  const bookmarkLabel = bookmarked ? (english ? "Remove bookmark" : "取消收藏") : (english ? "Bookmark" : "收藏");

  function showSpark(element: HTMLElement) {
    const row = element.closest(".forum-post-actions")?.getBoundingClientRect();
    const icon = element.querySelector(".forum-action-icon")?.getBoundingClientRect();
    if (row && icon) spark.current?.spark(icon.left - row.left + icon.width / 2, icon.top - row.top + icon.height / 2);
  }

  return <div className="forum-post-actions-control">
    <ClickSpark ref={spark} className="forum-post-actions" triggerOnClick={false}>
      <a className="forum-action forum-action--reply" data-forum-action="reply" href={replyHref} aria-label={replyLabel} title={english ? "Reply" : "回复"} onClick={(event) => showSpark(event.currentTarget)}>
        <span className="forum-action-icon"><MessageSquare size={21} aria-hidden="true" /></span><span className="forum-action-count" aria-hidden="true">{replyCount}</span>
      </a>
      <button className="forum-action forum-action--share" data-forum-action="share" type="button" aria-label={shareLabel} title={english ? "Share topic" : "转发话题"} disabled={sharePending} onClick={(event) => {
        const button = event.currentTarget;
        setShareMessage("");
        setShareError("");
        setManualUrl("");
        startShare(async () => {
          const url = new URL(topicPath, window.location.origin).href;
          const result = await shareForumPostLink({ url, title }, navigator);
          if (result === "cancelled") return;
          if (result === "manual") {
            setManualUrl(url);
            setShareError(english ? "Could not copy automatically. Select and copy this link." : "未能自动复制，请选中下方链接后复制。");
            return;
          }
          setShareMessage(result === "shared" ? (english ? "Topic shared." : "话题已分享。") : (english ? "Topic link copied." : "话题链接已复制。"));
          showSpark(button);
          if (isAuthenticated) {
            const data = new FormData();
            data.set("postId", postId);
            try { setShares((await recordForumShareAction(data)).count); }
            catch { setShareError(english ? "Sharing succeeded, but its count could not be saved. Please try again later." : "分享已完成，但未能保存转发记录，请稍后再试。"); }
          }
        });
      }}><span className="forum-action-icon"><Repeat2 size={21} aria-hidden="true" /></span><span className="forum-action-count" aria-hidden="true">{shares}</span></button>
      <ForumLikeButton locale={locale} postId={postId} count={likeCount} isLiked={isLiked} isAuthenticated={isAuthenticated} returnTo={`/forum/${postId}`} variant="icon" onSaved={showSpark} />
      {isAuthenticated ? <button className="forum-action forum-action--bookmark" data-forum-action="bookmark" type="button" aria-label={bookmarkLabel} title={bookmarkLabel} aria-pressed={bookmarked} disabled={bookmarkPending} onClick={(event) => {
        const button = event.currentTarget;
        setBookmarkError("");
        startBookmark(async () => {
          const data = new FormData();
          data.set("postId", postId);
          data.set("bookmarked", String(!bookmarked));
          try {
            setBookmarked((await setForumBookmarkAction(data)).bookmarked);
            showSpark(button);
          } catch { setBookmarkError(english ? "Could not save the bookmark. Please try again." : "未能保存收藏，请稍后再试。"); }
        });
      }}><span className="forum-action-icon"><Bookmark size={21} aria-hidden="true" /></span></button> : <a className="forum-action forum-action--bookmark" data-forum-action="bookmark" href={loginHref} aria-label={english ? "Sign in to bookmark" : "登录后收藏"} title={english ? "Bookmark" : "收藏"}><span className="forum-action-icon"><Bookmark size={21} aria-hidden="true" /></span></a>}
    </ClickSpark>
    {shareMessage ? <p className="forum-action-status" role="status">{shareMessage}</p> : null}
    {shareError ? <p className="forum-action-error" role="alert">{shareError}</p> : null}
    {manualUrl ? <input ref={linkInput} className="forum-share-link" aria-label={english ? "Topic link, select to copy" : "话题链接，可选中复制"} value={manualUrl} readOnly onFocus={(event) => event.currentTarget.select()} onClick={(event) => event.currentTarget.select()} /> : null}
    {bookmarkError ? <p className="forum-action-error" role="alert">{bookmarkError}</p> : null}
  </div>;
}
