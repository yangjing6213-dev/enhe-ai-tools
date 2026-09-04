"use client";

import { useState } from "react";
import Link from "next/link";
import { ENHE_API_BASE_URL } from "../mock-data";
import { ActionLink, ApiPanel, ApiSectionHeading, MockNotice, PrimaryActionLink } from "./shared";
import { CodeBlock } from "./code-block";
import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

const docsNav = [
  "快速开始",
  "Codex 配置",
  "Claude Code 配置",
  "Cursor 配置",
  "Cline 配置",
  "OpenAI SDK",
  "Anthropic SDK",
  "常见错误",
  "费用说明",
  "安全建议"
];

const codexUnix = `export OPENAI_API_KEY="YOUR_API_KEY"
export OPENAI_BASE_URL="${ENHE_API_BASE_URL}/v1"

curl ${ENHE_API_BASE_URL}/v1/models \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

const codexWindows = `$env:OPENAI_API_KEY="YOUR_API_KEY"
$env:OPENAI_BASE_URL="${ENHE_API_BASE_URL}/v1"

curl ${ENHE_API_BASE_URL}/v1/models `
  + "`\n  -H \"Authorization: Bearer YOUR_API_KEY\"";

const chatCurl = `curl ${ENHE_API_BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "enhe-coder-pro",
    "messages": [
      { "role": "user", "content": "用一句话介绍 ENHE API" }
    ],
    "stream": false
  }'`;

const anthropicCurl = `curl ${ENHE_API_BASE_URL}/v1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "enhe-claude-bridge",
    "max_tokens": 512,
    "messages": [
      { "role": "user", "content": "返回一个简短测试响应" }
    ],
    "stream": false
  }'`;

const openAiSdk = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "YOUR_API_KEY",
  baseURL: "${ENHE_API_BASE_URL}/v1"
});

const completion = await client.chat.completions.create({
  model: "enhe-coder-pro",
  messages: [{ role: "user", content: "测试 ENHE API" }]
});

console.log(completion.choices[0]?.message?.content);`;

const anthropicSdk = `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: "YOUR_API_KEY",
  baseURL: "${ENHE_API_BASE_URL}"
});

const message = await client.messages.create({
  model: "enhe-claude-bridge",
  max_tokens: 512,
  messages: [{ role: "user", content: "测试 ENHE Anthropic-compatible endpoint" }]
});

console.log(message.content);`;

export function DocsHubPage() {
  const [platform, setPlatform] = useState<"unix" | "windows">("unix");

  return (
    <div className="space-y-6">
      <ApiSectionHeading title="配置文档中心" intro="示例全部使用 YOUR_API_KEY 占位，不显示真实密钥。调用后可在请求日志页验证是否成功。" />
      <MockNotice>Base URL：<code>{ENHE_API_BASE_URL}</code>。如工具要求 OpenAI Base URL，请填写 <code>{ENHE_API_BASE_URL}/v1</code>。</MockNotice>
      <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
        <ApiPanel className="h-max">
          <nav className="grid gap-2" aria-label="ENHE API docs sections">
            {docsNav.map((item) => (
              <a key={item} href={`#${item}`} className="rounded-xl px-3 py-2 text-sm font-black text-[var(--marketing-muted)] transition hover:bg-white/8 hover:text-[var(--marketing-text)]">
                {item}
              </a>
            ))}
          </nav>
        </ApiPanel>

        <div className="space-y-6">
          <ApiPanel title="快速开始" description="先创建 API Key，再配置工具并发起一次模型列表请求。" >
            <Section id="快速开始">
              <div className="grid gap-4 md:grid-cols-3">
                {["创建 API Key", "配置 Base URL", "查看请求日志"].map((step) => (
                  <div key={step} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <h3 className="text-sm font-black text-[var(--marketing-text)]">{step}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">完成后到日志页按 request_id、路径或模型筛选。</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <PrimaryActionLink href="/user/api/keys">创建 API Key</PrimaryActionLink>
                <ActionLink href="/user/api/logs">打开请求日志</ActionLink>
              </div>
            </Section>
          </ApiPanel>

          <ApiPanel title="Codex 配置">
            <Section id="Codex 配置">
              <PlatformTabs platform={platform} setPlatform={setPlatform} />
              <CodeBlock title={platform === "unix" ? "macOS / Linux" : "Windows PowerShell"} code={platform === "unix" ? codexUnix : codexWindows} />
              <p className="mt-4 text-sm leading-6 text-[var(--marketing-muted)]">配置完成后先请求模型列表，再到请求日志页验证是否出现 /v1/models 记录。</p>
            </Section>
          </ApiPanel>

          <ApiPanel title="Claude Code 配置">
            <Section id="Claude Code 配置">
              <p className="mb-4 text-sm leading-6 text-[var(--marketing-muted)]">Claude Code 场景使用 Anthropic-compatible endpoint，对应路径为 /v1/messages。</p>
              <CodeBlock title="Anthropic-compatible 测试请求" code={anthropicCurl} />
            </Section>
          </ApiPanel>

          <ApiPanel title="Cursor 配置">
            <Section id="Cursor 配置">
              <ToolConfigRows rows={[
                ["API Key", "YOUR_API_KEY"],
                ["Base URL", `${ENHE_API_BASE_URL}/v1`],
                ["模型示例", "enhe-coder-pro"]
              ]} />
            </Section>
          </ApiPanel>

          <ApiPanel title="Cline 配置">
            <Section id="Cline 配置">
              <ToolConfigRows rows={[
                ["Provider", "OpenAI-compatible"],
                ["Base URL", `${ENHE_API_BASE_URL}/v1`],
                ["API Key", "YOUR_API_KEY"],
                ["测试方式", "发起一次 chat completions 请求后查看日志"]
              ]} />
              <div className="mt-5">
                <CodeBlock title="Chat Completions 测试请求" code={chatCurl} />
              </div>
            </Section>
          </ApiPanel>

          <ApiPanel title="OpenAI SDK">
            <Section id="OpenAI SDK">
              <CodeBlock title="Node.js 示例" language="ts" code={openAiSdk} />
            </Section>
          </ApiPanel>

          <ApiPanel title="Anthropic SDK">
            <Section id="Anthropic SDK">
              <CodeBlock title="Node.js 示例" language="ts" code={anthropicSdk} />
            </Section>
          </ApiPanel>

          <ApiPanel title="常见错误">
            <Section id="常见错误">
              <div className="grid gap-3">
                {[
                  ["401 invalid_api_key", "检查 API Key 是否复制完整，是否已撤销。"],
                  ["402 insufficient_credit", "进入用量页或账单页补充额度后重试。"],
                  ["429 rate_limit_exceeded", "降低并发或等待窗口恢复。"],
                  ["423 model_disabled", "模型已维护或关闭，请更换模型或等待恢复。"]
                ].map(([code, text]) => (
                  <div key={code} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <h3 className="font-mono text-sm font-black text-[var(--marketing-text)]">{code}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">{text}</p>
                  </div>
                ))}
              </div>
            </Section>
          </ApiPanel>

          <ApiPanel title="费用说明">
            <Section id="费用说明">
              <p className="text-sm leading-7 text-[var(--marketing-muted)]">费用按模型、输入 token、输出 token 和 ENHE 计费规则计算。MVP 账本设计要求每次扣费都能关联 request_id、请求日志和额度流水。</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/user/api/usage" className="rounded-full border border-white/14 px-4 py-2 text-sm font-black text-[var(--marketing-text)]">查看用量</Link>
                <Link href="/user/api/billing" className="rounded-full border border-white/14 px-4 py-2 text-sm font-black text-[var(--marketing-text)]">查看账单</Link>
              </div>
            </Section>
          </ApiPanel>

          <ApiPanel title="安全建议">
            <Section id="安全建议">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "不要把完整 API Key 提交到 Git 仓库。",
                  "为 Codex、脚本和生产环境分别创建不同 Key。",
                  "发现异常消耗时先查看日志，再撤销可疑 Key。",
                  "公开文档和截图中只使用 prefix 或 YOUR_API_KEY。"
                ].map((tip) => (
                  <div key={tip} className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm font-bold leading-6 text-[var(--marketing-muted)]">{tip}</div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <CopyButton value={ENHE_API_BASE_URL} label="复制 Base URL" />
                <ActionLink href="/user/api/keys">管理 API Key</ActionLink>
              </div>
            </Section>
          </ApiPanel>
        </div>
      </div>
    </div>
  );
}

function PlatformTabs({
  platform,
  setPlatform
}: {
  platform: "unix" | "windows";
  setPlatform: (platform: "unix" | "windows") => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {[
        ["unix", "macOS / Linux"],
        ["windows", "Windows"]
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-black transition",
            platform === value ? "border-[var(--marketing-accent)] bg-[var(--marketing-accent)] text-white" : "border-white/14 bg-white/8 text-[var(--marketing-text)]"
          )}
          onClick={() => setPlatform(value as "unix" | "windows")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ToolConfigRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-2 rounded-2xl border border-white/10 bg-white/6 p-4 md:grid-cols-[160px_1fr_auto] md:items-center">
          <p className="text-sm font-black text-[var(--marketing-muted)]">{label}</p>
          <code className="break-all rounded-xl bg-[#14161b] px-3 py-2 text-sm font-bold text-[var(--marketing-text)]">{value}</code>
          <CopyButton value={value} />
        </div>
      ))}
    </div>
  );
}

function Section({ id, children }: React.PropsWithChildren<{ id: string }>) {
  return <div id={id} className="scroll-mt-28">{children}</div>;
}
