"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type {
  CustomerSupportFaq,
  CustomerSupportLocale
} from "@/lib/customer-support";

type SubmitStatus = "idle" | "submitting" | "success" | "error" | "rate_limited";

const widgetCopy = {
  zh: {
    launcherLabel: "客服",
    title: "客服助手",
    closeLabel: "关闭客服",
    greeting: "你好，我可以帮你快速了解产品、价格、教程和购买流程。",
    commonQuestions: "常见问题",
    backToQuestions: "返回常见问题",
    leaveMessage: "提交其他问题",
    formTitle: "提交留言",
    messageLabel: "问题内容（必填）",
    messagePlaceholder: "请描述你遇到的问题",
    emailLabel: "联系邮箱（可选）",
    emailPlaceholder: "方便回复时填写",
    submit: "发送留言",
    submitting: "正在发送",
    success: "留言已发送，我们会尽快处理。",
    error: "暂时无法发送，请稍后重试或使用页面底部的公开联系邮箱。",
    rateLimited: "提交次数过多，请稍后再试。",
    emailNotice: "填写邮箱后，我们可以直接通过邮件回复你。"
  },
  en: {
    launcherLabel: "Chat",
    title: "Chat",
    closeLabel: "Close chat",
    greeting: "I can help with products, pricing, tutorials, and purchase steps.",
    commonQuestions: "Common questions",
    backToQuestions: "Back to common questions",
    leaveMessage: "Ask another question",
    formTitle: "Leave a message",
    messageLabel: "Question (required)",
    messagePlaceholder: "Describe your question",
    emailLabel: "Contact email (optional)",
    emailPlaceholder: "Add an email if you want a reply",
    submit: "Send message",
    submitting: "Sending",
    success: "Your message has been sent. We will review it soon.",
    error: "The message could not be sent. Try again later or use the public email in the footer.",
    rateLimited: "Too many messages were submitted. Please try again later.",
    emailNotice: "If you add an email address, we can reply directly by email."
  }
} as const;

export function CustomerSupportWidget({
  locale,
  faqs
}: {
  locale: CustomerSupportLocale;
  faqs: CustomerSupportFaq[];
}) {
  const copy = widgetCopy[locale];
  const honeypotRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFaqId, setSelectedFaqId] = useState<string | null>(null);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const selectedFaq = faqs.find((faq) => faq.id === selectedFaqId) ?? null;

  function closePanel() {
    setIsOpen(false);
    setSelectedFaqId(null);
    setShowMessageForm(false);
    setStatus("idle");
    launcherRef.current?.focus();
  }

  function focusPanelStart() {
    requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    });
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showQuestions() {
    setSelectedFaqId(null);
    setShowMessageForm(false);
    setStatus("idle");
    focusPanelStart();
  }

  function selectFaq(faq: CustomerSupportFaq) {
    setStatus("idle");
    if (faq.id === "leave-message") {
      setSelectedFaqId(null);
      setShowMessageForm(true);
      focusPanelStart();
      return;
    }

    setSelectedFaqId(faq.id);
    setShowMessageForm(false);
    focusPanelStart();
  }

  function openMessageForm() {
    setShowMessageForm(true);
    focusPanelStart();
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      setStatus("error");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: normalizedMessage,
          email: email.trim(),
          locale,
          pagePath: window.location.pathname,
          website: honeypotRef.current?.value ?? ""
        })
      });

      if (response.ok) {
        setMessage("");
        setEmail("");
        setStatus("success");
        focusPanelStart();
        return;
      }

      setStatus(response.status === 429 ? "rate_limited" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="customer-support-widget fixed bottom-4 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-[360px] flex-col items-end sm:bottom-6 sm:right-6"
      data-support-open={isOpen ? "true" : "false"}
    >
      {isOpen ? (
        <section
          ref={panelRef}
          id="customer-support-panel"
          role="dialog"
          aria-labelledby="customer-support-title"
          onKeyDown={handlePanelKeyDown}
          className="w-full max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-[var(--marketing-border-strong)] bg-[#101821]/96 p-4 text-[var(--marketing-text)] shadow-[0_24px_70px_rgba(0,8,14,0.5)] backdrop-blur-xl sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p id="customer-support-title" className="text-base font-black tracking-normal">
                {copy.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">{copy.greeting}</p>
            </div>
            <button
              autoFocus
              type="button"
              onClick={closePanel}
              aria-label={copy.closeLabel}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/7 text-[var(--marketing-muted)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>

          {showMessageForm ? (
            <form onSubmit={submitMessage} className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[var(--marketing-soft-text)]">{copy.formTitle}</p>
                <button
                  type="button"
                  onClick={showQuestions}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--marketing-accent)]"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  {copy.backToQuestions}
                </button>
              </div>

              {status === "success" ? (
                <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-4" role="status" aria-live="polite">
                  <p className="text-sm font-semibold leading-6 text-emerald-100">{copy.success}</p>
                  <button
                    type="button"
                    onClick={showQuestions}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--marketing-accent)]"
                  >
                    {copy.backToQuestions}
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="customer-support-message" className="text-xs font-bold text-[var(--marketing-soft-text)]">
                      {copy.messageLabel}
                    </label>
                    <textarea
                      id="customer-support-message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      required
                      maxLength={2000}
                      rows={5}
                      placeholder={copy.messagePlaceholder}
                      className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-white/7 px-3 py-3 text-sm leading-6 text-[var(--marketing-text)] outline-none placeholder:text-[var(--dim)] focus:border-[var(--marketing-accent)]"
                    />
                  </div>

                  <div>
                    <label htmlFor="customer-support-email" className="text-xs font-bold text-[var(--marketing-soft-text)]">
                      {copy.emailLabel}
                    </label>
                    <input
                      id="customer-support-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      maxLength={254}
                      placeholder={copy.emailPlaceholder}
                      className="mt-2 w-full rounded-xl border border-white/12 bg-white/7 px-3 py-3 text-sm text-[var(--marketing-text)] outline-none placeholder:text-[var(--dim)] focus:border-[var(--marketing-accent)]"
                    />
                    <p className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">{copy.emailNotice}</p>
                  </div>

                  <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
                    <label htmlFor="customer-support-website">Website</label>
                    <input
                      ref={honeypotRef}
                      id="customer-support-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  {status === "error" || status === "rate_limited" ? (
                    <p
                      role="status"
                      aria-live="polite"
                      className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-semibold leading-5 text-rose-100"
                    >
                      {status === "rate_limited" ? copy.rateLimited : copy.error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--marketing-accent)] px-4 py-3 text-sm font-black text-[#071218] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                  >
                    {status === "submitting" ? (
                      <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
                    ) : (
                      <Send size={17} aria-hidden="true" />
                    )}
                    {status === "submitting" ? copy.submitting : copy.submit}
                  </button>
                </>
              )}
            </form>
          ) : selectedFaq ? (
            <div className="mt-5">
              <button
                type="button"
                onClick={showQuestions}
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--marketing-accent)]"
              >
                <ChevronLeft size={14} aria-hidden="true" />
                {copy.backToQuestions}
              </button>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/7 p-4">
                <p className="text-sm font-black leading-6 text-[var(--marketing-text)]">{selectedFaq.question}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--marketing-muted)]">{selectedFaq.answer}</p>
                {selectedFaq.links?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedFaq.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--marketing-accent)]/30 bg-[var(--marketing-accent)]/10 px-3 py-2 text-xs font-black text-[var(--marketing-accent)] transition-colors hover:border-[var(--marketing-accent)]"
                      >
                        {link.label}
                        <ChevronRight size={13} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={openMessageForm}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/7 px-4 py-3 text-sm font-black text-[var(--marketing-soft-text)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
              >
                <MessageCircle size={16} aria-hidden="true" />
                {copy.leaveMessage}
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-xs font-black uppercase text-[var(--marketing-muted)]">{copy.commonQuestions}</p>
              <div className="mt-2 divide-y divide-white/10 border-y border-white/10">
                {faqs.map((faq) => (
                  <button
                    key={faq.id}
                    type="button"
                    onClick={() => selectFaq(faq)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold leading-5 text-[var(--marketing-soft-text)] transition-colors hover:text-[var(--marketing-accent)]"
                  >
                    <span>{faq.question}</span>
                    <ChevronRight className="shrink-0" size={15} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : null}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={copy.launcherLabel}
        aria-expanded={isOpen}
        aria-controls="customer-support-panel"
        tabIndex={isOpen ? -1 : 0}
        className={
          isOpen
            ? "sr-only"
            : "customer-support-launcher inline-flex items-center gap-2 rounded-full border border-[var(--marketing-accent)]/35 bg-[#101821]/95 px-4 py-3 text-sm font-black text-[var(--marketing-text)] shadow-[0_14px_38px_rgba(0,8,14,0.42)] backdrop-blur-xl transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--marketing-accent)]"
        }
      >
        <MessageCircle size={18} className="text-[var(--marketing-accent)]" aria-hidden="true" />
        <span className="customer-support-launcher-label">{copy.launcherLabel}</span>
      </button>
    </div>
  );
}
