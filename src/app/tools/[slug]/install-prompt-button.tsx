"use client";

import { useState } from "react";

export function InstallPromptButton({ toolId, locale }: { toolId: string; locale: "zh" | "en" }) {
  const english = locale === "en";
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualPrompt, setManualPrompt] = useState("");
  const [error, setError] = useState("");

  async function copyPrompt() {
    setPending(true);
    setCopied(false);
    setError("");
    setManualPrompt("");
    try {
      const response = await fetch(`/api/tools/${encodeURIComponent(toolId)}/install-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      const payload = await response.json() as { prompt?: unknown };
      if (!response.ok || typeof payload.prompt !== "string" || !payload.prompt) {
        throw new Error("not-authorized");
      }

      try {
        await navigator.clipboard.writeText(payload.prompt);
        setCopied(true);
      } catch {
        const field = document.createElement("textarea");
        field.value = payload.prompt;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copiedWithFallback = document.execCommand("copy");
        document.body.removeChild(field);
        if (copiedWithFallback) setCopied(true);
        else setManualPrompt(payload.prompt);
      }
    } catch {
      setError(english ? "Please sign in or complete the purchase before copying this prompt." : "请先登录或完成购买，再复制提示词。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5">
      <button type="button" onClick={copyPrompt} disabled={pending} className="rounded-full bg-[var(--marketing-accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
        {pending ? (english ? "Preparing…" : "正在准备…") : copied ? (english ? "Prompt copied" : "已复制提示词") : (english ? "Copy install prompt" : "一键安装提示词")}
      </button>
      {copied ? <p role="status" className="mt-2 text-sm text-emerald-300">{english ? "The prompt is on your clipboard." : "提示词已复制到剪贴板。"}</p> : null}
      {error ? <p role="alert" className="mt-2 text-sm text-amber-200">{error}</p> : null}
      {manualPrompt ? (
        <label className="mt-3 grid gap-2 text-sm text-[#C5D0E2]">
          <span>{english ? "Clipboard access is unavailable. Select and copy the prompt below." : "浏览器未允许自动复制，请选中下方内容并手动复制。"}</span>
          <textarea readOnly value={manualPrompt} rows={8} className="w-full rounded-xl border border-white/15 bg-[#07101E] p-3 text-sm text-[#F6FAFF]" />
        </label>
      ) : null}
    </div>
  );
}
