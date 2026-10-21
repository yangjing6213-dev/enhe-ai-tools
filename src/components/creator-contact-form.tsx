"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { MessageCircle } from "lucide-react";
import { sendCreatorMessageAction } from "@/app/actions";
import type { Locale } from "@/lib/i18n";

const initialState = { status: "idle" as const, message: "" };

export function CreatorContactForm({
  creatorId,
  currentUserId,
  toolId,
  returnTo,
  locale,
}: {
  creatorId: string;
  currentUserId: string | null;
  toolId: string;
  returnTo: string;
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState(sendCreatorMessageAction, initialState);
  const [open, setOpen] = useState(false);
  const isEnglish = locale === "en";

  if (!currentUserId) {
    return (
      <Link
        href={`${isEnglish ? "/en/login" : "/login"}?returnTo=${encodeURIComponent(returnTo)}`}
        className="creator-contact-button"
      >
        <MessageCircle size={17} aria-hidden="true" />
        {isEnglish ? "Ask the creator" : "联系创作者"}
      </Link>
    );
  }

  if (currentUserId === creatorId) {
    return <p className="creator-contact-self-note">{isEnglish ? "You are the creator of this product." : "这是你创建的产品。"}</p>;
  }

  return (
    <div className="creator-contact-form-wrap">
      <button
        type="button"
        className="creator-contact-button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MessageCircle size={17} aria-hidden="true" />
        {isEnglish ? "Ask the creator" : "联系创作者"}
      </button>
      {open ? (
        <form action={formAction} className="creator-contact-form">
          <input type="hidden" name="toolId" value={toolId} />
          <label htmlFor={`creator-message-${toolId}`}>
            {isEnglish ? "Your message" : "留言内容"}
          </label>
          <textarea
            id={`creator-message-${toolId}`}
            name="content"
            minLength={2}
            maxLength={1000}
            rows={4}
            required
            placeholder={isEnglish ? "Ask a question about this product…" : "请填写你想咨询的问题…"}
          />
          <p className="creator-contact-hint">
            {isEnglish ? "Your message will appear in the creator’s ENHE AI inbox." : "留言会发送到创作者的 ENHE AI 站内通知。"}
          </p>
          <button type="submit" disabled={pending}>
            {pending ? (isEnglish ? "Sending…" : "发送中…") : (isEnglish ? "Send message" : "发送留言")}
          </button>
          {state.message ? (
            <p className={state.status === "success" ? "creator-contact-success" : "creator-contact-error"} role={state.status === "success" ? "status" : "alert"}>
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
