"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import type { RedesignLocale } from "@/components/redesign/types";
import { AI_WORKFLOW_AGENTS, AI_WORKFLOW_RUNTIMES, resolveAiWorkflowRuntime, type AiWorkflowAgent, type AiWorkflowRuntime } from "@/lib/ai-workflows/install";

export function AiWorkflowFavoriteButton({
  slug, initialCount, initialFavorite, locale, loginHref,
}: {
  slug: string; initialCount: number; initialFavorite: boolean; locale: RedesignLocale; loginHref: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const label = locale === "en" ? (favorite ? "Remove favorite" : "Save workflow") : (favorite ? "取消收藏" : "收藏工作流");

  async function toggle() {
    if (busy || loginRequired) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ai-workflows/${encodeURIComponent(slug)}/favorite`, { method: "POST", headers: { Accept: "application/json" } });
      if (response.status === 401) { setLoginRequired(true); return; }
      const body = await response.json() as { isFavorite?: boolean; favoriteCount?: number };
      if (!response.ok || typeof body.isFavorite !== "boolean") throw new Error("Favorite update failed");
      setFavorite(body.isFavorite);
      setCount(body.favoriteCount ?? count);
    } catch {
      setLoginRequired(true);
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex min-h-9 items-center gap-2 text-sm">
    {loginRequired ? <Link href={loginHref} className="text-[var(--marketing-accent)] underline">{locale === "en" ? "Sign in to save" : "登录后收藏"}</Link> : <button type="button" onClick={toggle} disabled={busy} aria-label={label} aria-pressed={favorite} className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-[var(--marketing-text)] hover:text-[#d62749] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"><Heart aria-hidden="true" className={`size-4 ${favorite ? "fill-[#e43355] text-[#e43355]" : ""}`} />{label}</button>}
    <span aria-live="polite" className="text-xs text-[var(--marketing-muted)]">{count}</span>
  </div>;
}

export function AiWorkflowReviewForm({
  slug, canReview, locale,
}: { slug: string; canReview: boolean; locale: RedesignLocale }) {
  const [rating, setRating] = useState("5");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/ai-workflows/${encodeURIComponent(slug)}/review`, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ rating: Number(rating), content }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error === "LOGIN_REQUIRED" ? "LOGIN_REQUIRED" : "REVIEW_FAILED");
      setMessage(locale === "en" ? "Review submitted for moderation." : "评价已提交，审核通过后显示。");
      setContent("");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setMessage(code === "LOGIN_REQUIRED" ? (locale === "en" ? "Sign in before reviewing." : "请先登录后再评价。") : (locale === "en" ? "Could not submit the review. Check your download or purchase access and try again." : "提交失败。请确认已下载或购买该工作流后重试。"));
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="mt-5 grid gap-3 rounded-xl border border-[var(--marketing-border)] bg-white p-4">
    <label className="grid max-w-40 gap-1 text-sm"><span>{locale === "en" ? "Your rating" : "你的评分"}</span><span className="flex items-center gap-2"><Star aria-hidden="true" className="size-4 text-amber-500" /><select value={rating} onChange={(event) => setRating(event.currentTarget.value)} className="rounded-lg border px-3 py-2" disabled={!canReview || busy}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></span></label>
    <label className="grid gap-1 text-sm"><span>{locale === "en" ? "Comment (optional)" : "评价内容（选填）"}</span><textarea value={content} onChange={(event) => setContent(event.currentTarget.value)} maxLength={2000} rows={3} className="rounded-lg border px-3 py-2" disabled={!canReview || busy} /></label>
    <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={!canReview || busy} className="rounded-lg bg-[var(--marketing-accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? (locale === "en" ? "Submitting…" : "提交中…") : (locale === "en" ? "Submit review" : "提交评价")}</button>{message ? <p role="status" className="text-sm text-[var(--marketing-muted)]">{message}</p> : null}</div>
    {!canReview ? <p className="text-xs leading-5 text-[var(--marketing-muted)]">{locale === "en" ? "Sign in and download a free item or purchase a paid item before reviewing." : "登录并下载免费工作流，或购买付费工作流后即可评价。"}</p> : null}
  </form>;
}

const installAgentNames: Record<AiWorkflowAgent, { zh: string; en: string }> = {
  codex: { zh: "Codex", en: "Codex" },
  claude_code: { zh: "Claude Code", en: "Claude Code" },
  cursor: { zh: "Cursor", en: "Cursor" },
  grok: { zh: "Grok", en: "Grok" },
  openclaw: { zh: "OpenClaw", en: "OpenClaw" },
};

const installRuntimeNames: Record<AiWorkflowRuntime, { zh: string; en: string }> = {
  windows: { zh: "Windows", en: "Windows" },
  wsl2: { zh: "WSL2", en: "WSL2" },
  macos: { zh: "macOS", en: "macOS" },
  linux: { zh: "Linux", en: "Linux" },
  docker: { zh: "Docker", en: "Docker" },
};

export function AiWorkflowInstallPanel({
  slug,
  locale,
  canGenerate,
  verifiedEnvironments,
}: {
  slug: string;
  locale: RedesignLocale;
  canGenerate: boolean;
  verifiedEnvironments: string[];
}) {
  const runtimes = Array.from(new Set(verifiedEnvironments.map(resolveAiWorkflowRuntime).filter((value): value is AiWorkflowRuntime => Boolean(value))));
  const [agent, setAgent] = useState<AiWorkflowAgent>(AI_WORKFLOW_AGENTS[0]);
  const [runtime, setRuntime] = useState<AiWorkflowRuntime | "">(runtimes[0] ?? "");
  const [instruction, setInstruction] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!canGenerate || !runtime || busy) return;
    setBusy(true);
    setMessage("");
    setInstruction("");
    try {
      const response = await fetch(`/api/ai-workflows/${encodeURIComponent(slug)}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ agent, runtime, locale: locale === "en" ? "en" : "zh" }),
      });
      const body = await response.json() as { instruction?: string; error?: string };
      if (!response.ok || !body.instruction) throw new Error(body.error ?? "INSTALL_INSTRUCTION_FAILED");
      setInstruction(body.instruction);
      try {
        await navigator.clipboard.writeText(body.instruction);
        setMessage(locale === "en" ? "Instruction copied. The download link is temporary." : "指令已复制，里面的下载链接有时效。到期后可重新生成。");
      } catch {
        setMessage(locale === "en" ? "Instruction ready below. Select and copy it manually." : "指令已生成，请在下方选中并手动复制。");
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const messages: Record<string, { zh: string; en: string }> = {
        LOGIN_REQUIRED: { zh: "请登录并购买该工作流后生成安装指令。", en: "Sign in and purchase this workflow before generating the instruction." },
        PURCHASE_REQUIRED: { zh: "购买后即可生成包含短时下载地址的安装指令。", en: "Purchase this workflow to generate an instruction with a temporary download link." },
        ENVIRONMENT_NOT_VERIFIED: { zh: "所选运行环境尚未经过验证，请选择页面列出的已验证环境。", en: "The selected runtime is not verified. Choose an environment listed as tested." },
        DOWNLOAD_SERVICE_NOT_READY: { zh: "下载服务暂未就绪，请稍后重试。", en: "The download service is not ready yet. Try again later." },
        RATE_LIMITED: { zh: "生成次数较多，请稍后再试。", en: "Too many requests. Please try again later." },
      };
      setMessage(messages[code]?.[locale === "en" ? "en" : "zh"] ?? (locale === "en" ? "Could not generate the instruction. Please try again." : "暂时无法生成指令，请稍后重试。"));
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-6 rounded-2xl border border-[var(--marketing-border)] bg-white p-5">
    <div>
      <h3 className="text-lg font-semibold text-[var(--marketing-text)]">{locale === "en" ? "One-click install instruction" : "一键安装指令"}</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--marketing-muted)]">{locale === "en" ? "Choose an assistant and a verified runtime. Copy the instruction into that assistant; it will first check whether it can actually run commands." : "选择智能体和已验证环境，把生成的指令复制给对应智能体；它会先检查当前会话是否真的能执行命令。"}</p>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm"><span>{locale === "en" ? "Assistant" : "智能体"}</span><select value={agent} onChange={(event) => setAgent(event.currentTarget.value as AiWorkflowAgent)} className="rounded-lg border border-[var(--marketing-border)] bg-white px-3 py-2">{AI_WORKFLOW_AGENTS.map((value) => <option key={value} value={value}>{installAgentNames[value][locale === "en" ? "en" : "zh"]}</option>)}</select></label>
      <label className="grid gap-1 text-sm"><span>{locale === "en" ? "Verified runtime" : "已验证环境"}</span><select value={runtime} onChange={(event) => setRuntime(event.currentTarget.value as AiWorkflowRuntime)} disabled={!runtimes.length} className="rounded-lg border border-[var(--marketing-border)] bg-white px-3 py-2">{runtimes.map((value) => <option key={value} value={value}>{installRuntimeNames[value][locale === "en" ? "en" : "zh"]}</option>)}</select></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={generate} disabled={!canGenerate || !runtime || busy} className="rounded-lg bg-[var(--marketing-accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? (locale === "en" ? "Preparing…" : "正在生成…") : (locale === "en" ? "Generate and copy" : "生成并复制指令")}</button><p role="status" aria-live="polite" className="text-sm text-[var(--marketing-muted)]">{message || (!canGenerate ? (locale === "en" ? "Available after purchase." : "购买后即可生成。") : !runtimes.length ? (locale === "en" ? "No verified runtime is available." : "暂无已验证的运行环境。") : "")}</p></div>
    {instruction ? <textarea aria-label={locale === "en" ? "Generated install instruction" : "已生成的安装指令"} readOnly value={instruction} rows={12} className="mt-4 w-full rounded-xl border border-[var(--marketing-border)] bg-slate-50 p-3 text-xs leading-5 text-slate-800" /> : null}
  </section>;
}
