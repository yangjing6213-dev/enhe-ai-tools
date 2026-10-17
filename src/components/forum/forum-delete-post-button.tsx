"use client";

import { deleteForumPostAction } from "@/app/forum/actions";
import { HoldDeleteForm } from "@/components/hold-delete-form";
import type { Locale } from "@/lib/i18n";

export function ForumDeletePostButton({ locale, postId }: { locale: Locale; postId: string }) {
  const confirmation = locale === "en"
    ? "Delete this topic? The topic and all its replies will no longer be public. Their content will be retained for recovery."
    : "确定删除这个话题吗？话题及全部回复将不再公开显示，内容会保留以便恢复。";
  return <HoldDeleteForm action={deleteForumPostAction} locale={locale} label={locale === "en" ? "Delete topic" : "删除话题"} title={confirmation} data-delete-kind="forum-post">
    <input type="hidden" name="postId" value={postId} />
  </HoldDeleteForm>;
}
