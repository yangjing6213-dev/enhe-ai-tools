"use client";

import { useState } from "react";
import type { ToolUsageStep } from "@/lib/tool-usage-instructions";

type ToolUsageEditorProps = {
  locale: "zh" | "en";
  defaultMode: string;
  defaultSteps: ToolUsageStep[];
  defaultPrompt: string;
  downloadFileUrl: string;
  downloadFileUrlHint: string;
};

const blankStep: ToolUsageStep = { title: "", description: "" };

export function ToolUsageEditor({
  locale,
  defaultMode,
  defaultSteps,
  defaultPrompt,
  downloadFileUrl,
  downloadFileUrlHint,
}: ToolUsageEditorProps) {
  const english = locale === "en";
  const [mode, setMode] = useState(defaultMode === "how_to" ? "how_to" : "link");
  const [steps, setSteps] = useState<ToolUsageStep[]>(defaultSteps.length ? defaultSteps : [blankStep]);
  const [link, setLink] = useState(downloadFileUrl);
  const [prompt, setPrompt] = useState(defaultPrompt);

  function updateStep(index: number, key: keyof ToolUsageStep, value: string) {
    setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? { ...step, [key]: value } : step));
  }

  return (
    <fieldset className="rounded-2xl border border-white/10 bg-white/6 p-5">
      <legend className="px-1 text-sm font-semibold text-[#F6FAFF]">{english ? "Delivery instructions" : "交付方式"}</legend>
      <label className="grid gap-2 text-sm text-[#F6FAFF]">
        <span>{english ? "Choose how customers receive this product" : "选择用户获取产品的方式"}</span>
        <select name="deliveryMode" value={mode} onChange={(event) => setMode(event.target.value)} className="min-h-12 rounded-xl border border-white/12 bg-[#07101E] px-4 text-[#F6FAFF]">
          <option value="link">{english ? "Enter a link" : "填写链接"}</option>
          <option value="how_to">{english ? "How to use" : "如何使用"}</option>
        </select>
      </label>

      {mode === "link" ? (
        <div className="mt-4">
          <label className="mb-2 block text-sm text-[#F6FAFF]" htmlFor="tool-download-link">{english ? "Download link" : "下载链接"}</label>
          <textarea id="tool-download-link" name="downloadFileUrl" rows={4} value={link} onChange={(event) => setLink(event.target.value)} placeholder={english ? "Enter a download URL, access code, or delivery note" : "可填写网盘链接、提取码、下载说明或备注"} className="min-h-28 w-full rounded-xl border border-white/12 bg-[#07101E] p-4 text-sm text-[#F6FAFF] outline-none focus:border-sky-400/60" />
          <p className="mt-2 text-xs leading-5 text-[#8B95A7]">{downloadFileUrlHint}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#F6FAFF]">{english ? "Usage steps" : "使用步骤"}</p>
                <p className="mt-1 text-xs leading-5 text-[#8B95A7]">{english ? "Add 1 to 5 steps. Their order here is the order shown on the product page. Steps and prompt are shared by both language pages." : "设置 1 到 5 个步骤；这里的排列顺序就是详情页显示顺序。步骤和提示词会在中英文页面共用，不会自动翻译。"}</p>
              </div>
              <span className="text-xs text-[#8B95A7]">{steps.length}/5</span>
            </div>
            <input type="hidden" name="usageStepCount" value={steps.length} />
            <div className="grid gap-3">
              {steps.map((step, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-white/10 bg-[#07101E]/55 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#F6FAFF]">{english ? `Step ${index + 1}` : `步骤 ${index + 1}`}</p>
                    {steps.length > 1 ? <button type="button" onClick={() => setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index))} className="text-xs text-rose-200 underline underline-offset-4">{english ? "Remove" : "删除此步"}</button> : null}
                  </div>
                  <input name={`usageStepTitle_${index}`} required maxLength={120} value={step.title} onChange={(event) => updateStep(index, "title", event.target.value)} placeholder={english ? "Step title" : "步骤标题"} className="min-h-11 rounded-lg border border-white/12 bg-[#07101E] px-3 text-sm text-[#F6FAFF] outline-none focus:border-sky-400/60" />
                  <textarea name={`usageStepDescription_${index}`} required maxLength={1200} rows={3} value={step.description} onChange={(event) => updateStep(index, "description", event.target.value)} placeholder={english ? "Explain what to do in this step" : "填写这一步的操作说明"} className="min-h-20 rounded-lg border border-white/12 bg-[#07101E] p-3 text-sm text-[#F6FAFF] outline-none focus:border-sky-400/60" />
                </div>
              ))}
            </div>
            {steps.length < 5 ? <button type="button" onClick={() => setSteps((current) => [...current, blankStep])} className="mt-3 rounded-full border border-white/15 px-4 py-2 text-sm text-[#E8EEF8] hover:border-sky-300/50">{english ? "Add a step" : "增加步骤"}</button> : null}
          </div>

          <label className="grid gap-2 text-sm text-[#F6FAFF]">
            <span>{english ? "Prompt to copy" : "一键安装提示词"}</span>
            <textarea name="installPrompt" required minLength={1} maxLength={30000} rows={8} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={english ? "Paste the prompt customers should copy after access is granted" : "填写用户获得权限后可一键复制的提示词"} className="min-h-40 rounded-xl border border-white/12 bg-[#07101E] p-4 text-sm text-[#F6FAFF] outline-none focus:border-sky-400/60" />
            <span className="text-xs leading-5 text-[#8B95A7]">{english ? "The prompt is only returned after the server confirms the user's access." : "提示词只会在服务器确认用户有权使用后返回。"}</span>
          </label>
        </div>
      )}
    </fieldset>
  );
}
