"use client";

import { useActionState } from "react";
import { useEffect } from "react";
import { replyToCreatorMessageAction } from "@/app/actions";

const initialState = { status: "idle" as const, message: "" };

export function CreatorMessageReplyForm({ notificationId, locale, onSuccess }: { notificationId: string; locale: "zh" | "en"; onSuccess?: () => void }) {
  const [state, action, pending] = useActionState(replyToCreatorMessageAction, initialState);
  const english = locale === "en";

  useEffect(() => {
    if (state.status === "success") onSuccess?.();
  }, [onSuccess, state.status]);

  return (
    <details className="mt-3">
      <summary className="inline-flex cursor-pointer text-xs font-semibold text-[var(--marketing-accent)]">{english ? "Reply to this message" : "回复此消息"}</summary>
      <form action={action} className="mt-3 grid gap-2">
        <input type="hidden" name="notificationId" value={notificationId} />
        <textarea name="content" required minLength={2} maxLength={1000} rows={3} className="w-full rounded-lg border border-[var(--enhe-border)] bg-[var(--enhe-page-bg)] p-2 text-sm text-[var(--enhe-text)] placeholder:text-[var(--enhe-text-muted)]" placeholder={english ? "Write your reply" : "输入回复内容"} />
        <button type="submit" disabled={pending} className="user-center-action w-fit px-3 py-1 text-xs">
          {pending ? (english ? "Sending…" : "发送中…") : (english ? "Send reply" : "发送回复")}
        </button>
        {state.message ? <p role="status" aria-live="polite" className={state.status === "error" ? "status-danger text-xs" : "status-success text-xs"}>{state.message}</p> : null}
      </form>
    </details>
  );
}
