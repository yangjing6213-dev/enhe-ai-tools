"use client";

import { useFormStatus } from "react-dom";
import { deleteForumPostAction } from "@/app/forum/actions";
import type { Locale } from "@/lib/i18n";

function DeleteButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="forum-delete-post" disabled={pending}>
    {pending ? (locale === "en" ? "Deleting…" : "删除中…") : (locale === "en" ? "Delete topic" : "删除话题")}
  </button>;
}

export function ForumDeletePostButton({ locale, postId }: { locale: Locale; postId: string }) {
  const confirmation = locale === "en"
    ? "Delete this topic? The topic and all its replies will no longer be public. Their content will be retained for recovery."
    : "确定删除这个话题吗？话题及全部回复将不再公开显示，内容会保留以便恢复。";
  return <form action={deleteForumPostAction} onSubmit={(event) => {
    if (!window.confirm(confirmation)) event.preventDefault();
  }}>
    <input type="hidden" name="postId" value={postId} />
    <DeleteButton locale={locale} />
  </form>;
}
