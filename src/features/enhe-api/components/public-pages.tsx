import Image from "next/image";
import { BookOpen, Braces, ChartNoAxesColumn, FileClock, KeyRound, WalletCards } from "lucide-react";
import { ENHE_API_BASE_URL, faqItems, pricingPlans, requestLogs, supportedTools } from "../mock-data";
import { ActionLink, ApiHeroTitle, ApiPageFrame, ApiPanel, ApiSectionHeading, IconFeature, MockNotice, PrimaryActionLink, StatusBadge } from "./shared";
import { CopyButton } from "./copy-button";

const integrationSteps = ["注册/登录", "创建 API Key", "配置工具", "发起请求", "查看日志与余额"];

export function AiApiLandingPage() {
  return (
    <ApiPageFrame className="space-y-16">
      <section className="grid min-h-[76dvh] items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <ApiHeroTitle
            kicker="ENHE API Gateway"
            title="面向中文开发者的统一 AI 模型 API 服务"
            intro="一个 ENHE API Key，连接主流 AI 编程工具、兼容接口、请求日志和额度管理。"
          />
          <div className="mt-7 flex flex-wrap gap-3">
            <PrimaryActionLink href="/user/api">进入开发者控制台</PrimaryActionLink>
            <ActionLink href="/ai-api/pricing">查看套餐</ActionLink>
            <ActionLink href="/user/api/docs">查看配置文档</ActionLink>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-black text-[var(--marketing-muted)]">Base URL</span>
            <code className="rounded-full border border-white/14 bg-[#14161b] px-4 py-2 text-sm font-bold text-[var(--marketing-text)]">{ENHE_API_BASE_URL}</code>
            <CopyButton value={ENHE_API_BASE_URL} />
          </div>
        </div>

        <ApiPanel className="relative overflow-hidden p-0">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/brand/enhe-icon-gradient-transparent-cropped.png"
                  alt="ENHE AI"
                  width={52}
                  height={52}
                  priority
                  unoptimized
                  className="rounded-2xl"
                />
                <div>
                  <p className="text-sm font-black text-[var(--marketing-text)]">ENHE API 控制台预览</p>
                  <p className="text-xs font-semibold text-[var(--marketing-muted)]">mock 数据，不连接真实 Gateway</p>
                </div>
              </div>
              <StatusBadge status="active" />
            </div>
          </div>
          <div className="grid gap-3 p-5">
            {requestLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-xs font-bold text-[var(--marketing-muted)]">{log.requestId}</p>
                  <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-black text-[var(--marketing-text)]">{log.statusCode}</span>
                </div>
                <p className="mt-3 text-sm font-black text-[var(--marketing-text)]">{log.method} {log.path}</p>
                <p className="mt-2 text-xs font-semibold text-[var(--marketing-muted)]">{log.model} / {log.latency} / {log.cost}</p>
              </div>
            ))}
          </div>
        </ApiPanel>
      </section>

      <section>
        <ApiSectionHeading title="核心能力" intro="公开页只展示产品定位与接入路径，真实鉴权、扣费和模型路由由后续 Gateway 服务实现。" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <IconFeature icon={KeyRound} title="一个 API Key 接入多种工具" text="面向 Codex、Claude Code、Cursor、Cline 等工具提供统一配置入口。" />
          <IconFeature icon={Braces} title="兼容 OpenAI / Anthropic 风格接口" text="MVP 规划包含 /v1/models、/v1/chat/completions 与 /v1/messages。" />
          <IconFeature icon={FileClock} title="支持请求日志" text="用 request_id、模型、状态码、延迟和费用定位每一次调用。" />
          <IconFeature icon={WalletCards} title="支持额度管理" text="控制台展示套餐余额、充值余额、推荐余额和消费窗口。" />
          <IconFeature icon={BookOpen} title="配置文档中心" text="用 YOUR_API_KEY 占位，避免在文档或页面暴露真实密钥。" />
          <IconFeature icon={ChartNoAxesColumn} title="面向灰度发布" text="先用 mock UI 建立信息架构，再逐步接入真实权限和数据源。" />
        </div>
      </section>

      <section>
        <ApiSectionHeading title="使用路径" intro="从公开页进入控制台，再到工具配置和日志验证，形成开发者首次使用闭环。" />
        <div className="grid gap-3 md:grid-cols-5">
          {integrationSteps.map((step, index) => (
            <div key={step} className="surface-panel-soft min-h-32 p-4">
              <p className="text-xs font-black text-[var(--marketing-accent)]">0{index + 1}</p>
              <h3 className="mt-3 text-base font-black text-[var(--marketing-text)]">{step}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
        <ApiPanel title="工具配置覆盖" description="阶段 3 只展示前端信息架构。后续阶段再接入真实 Gateway、API Key 创建和日志写入。">
          <div className="grid gap-3 sm:grid-cols-2">
            {supportedTools.map((tool) => (
              <div key={tool} className="rounded-2xl border border-white/10 bg-white/7 p-4">
                <p className="text-sm font-black text-[var(--marketing-text)]">{tool}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">查看 Base URL、API Key 占位符和测试请求。</p>
              </div>
            ))}
          </div>
        </ApiPanel>
        <ApiPanel title="FAQ">
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details key={item.question} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <summary className="cursor-pointer text-sm font-black text-[var(--marketing-text)]">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-[var(--marketing-muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </ApiPanel>
      </section>

      <MockNotice>当前页面为阶段 3 前端 mock 展示，不调用真实 API Gateway，不接入真实支付，不调用真实上游模型。</MockNotice>
    </ApiPageFrame>
  );
}

export function AiApiPricingPage() {
  return (
    <ApiPageFrame className="space-y-12">
      <section className="grid gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <ApiHeroTitle
          kicker="Mock Pricing"
          title="按额度和窗口管理 API 消耗"
          intro="套餐价格和额度为 mock，可后续调整。最终价格与服务条款以上线版本为准。"
        />
        <ApiPanel title="计费原则" description="展示面向 MVP 的套餐与额度表达，不代表正式销售价格。">
          <div className="grid gap-3 sm:grid-cols-2">
            {["额度先预付再扣费", "余额不足返回 402", "请求日志可追踪费用", "推荐奖励需有效调用"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/7 p-4 text-sm font-black text-[var(--marketing-text)]">{item}</div>
            ))}
          </div>
        </ApiPanel>
      </section>

      <section>
        <div className="grid gap-4 lg:grid-cols-4">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`surface-panel-soft flex min-h-[520px] flex-col p-5 ${plan.highlighted ? "border-[var(--marketing-accent)]/55" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[var(--marketing-text)]">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">{plan.audience}</p>
                </div>
                {plan.highlighted ? <span className="rounded-full bg-[var(--marketing-accent)] px-3 py-1 text-xs font-black text-white">推荐</span> : null}
              </div>
              <div className="mt-6">
                <p className="text-3xl font-black text-[var(--marketing-text)]">{plan.price}</p>
                <p className="mt-1 text-sm font-bold text-[var(--marketing-muted)]">{plan.period}</p>
              </div>
              <dl className="mt-6 grid gap-3 text-sm">
                <PlanSpec label="API 额度" value={plan.credit} />
                <PlanSpec label="5 小时窗口" value={plan.fiveHourWindow} />
                <PlanSpec label="7 天窗口" value={plan.sevenDayWindow} />
                <PlanSpec label="最大 API Key 数" value={plan.maxKeys === "custom" ? "自定义" : `${plan.maxKeys} 个`} />
              </dl>
              <PrimaryActionLink href="/user/api/billing" className="mt-auto w-full">{plan.cta}</PrimaryActionLink>
            </article>
          ))}
        </div>
      </section>

      <MockNotice>套餐价格和额度均为阶段 3 mock 数据。最终价格与服务条款以上线版本为准。</MockNotice>
    </ApiPageFrame>
  );
}

function PlanSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
      <dt className="text-xs font-black text-[var(--marketing-muted)]">{label}</dt>
      <dd className="mt-1 font-black text-[var(--marketing-text)]">{value}</dd>
    </div>
  );
}
