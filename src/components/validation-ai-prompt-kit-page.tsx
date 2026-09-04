import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { StructuredData } from "@/components/structured-data";
import { Badge, Container, SectionTitle } from "@/components/ui";
import type { Locale } from "@/lib/dictionaries";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildLocalePath,
  buildPageMetadata
} from "@/lib/seo";

const supportEmail = "ENHEAI.life@protonmail.com";

const content = {
  zh: {
    metaTitle: "ENHE AI Prompt Kit | AI 提示词模板包验证页",
    metaDescription:
      "一套面向 AI 工具站运营、自媒体、电商上架、SEO/GEO 和 AI 工具开发规划的实用提示词模板包验证页，包含免费样例、完整交付物和验证阶段价格测试。",
    eyebrow: "AI Prompt Kit 验证页",
    title: "一套帮你快速生成产品文案、SEO 内容和 AI 工具方案的实用提示词模板包",
    subtitle:
      "解决不会写产品介绍、SEO/GEO 内容、平台发布文案、AI 工具开发提示词，以及不知道怎么把 AI 用到副业项目里的问题。",
    primaryCta: "免费领取 5 个 Prompt 样例",
    secondaryCta: "我想试用完整模板包",
    tertiaryCta: "我想要适合我项目的 Prompt",
    previewTitle: "先免费领取 5 个高频 Prompt 模板",
    previewIntro: "先看能不能直接用，再决定是否需要完整模板包。",
    samplePrompts: [
      {
        title: "产品介绍生成 Prompt",
        description: "把产品名称、目标用户、核心功能和使用场景改成一段可发布的产品介绍。"
      },
      {
        title: "SEO 标题/描述生成 Prompt",
        description: "根据关键词、用户意图和页面类型，生成可测试的 title 与 meta description。"
      },
      {
        title: "小红书种草笔记 Prompt",
        description: "把一个工具或模板包写成适合收藏、评论和私信咨询的笔记草稿。"
      },
      {
        title: "闲鱼商品文案 Prompt",
        description: "生成标题、详情、交付说明、退款边界和合规提示，适合手动上架前检查。"
      },
      {
        title: "AI 工具开发需求 Prompt",
        description: "把一个副业想法整理成用户、功能、页面、数据和验收标准。"
      }
    ],
    deliverablesTitle: "完整包交付物",
    deliverablesIntro: "验证阶段先确认需求，再决定是否扩展为正式产品。",
    deliverables: [
      "100+ Prompt 模板",
      "内容创作 / SEO / GEO / 产品上架 / AI 工具开发 / 私域运营 / 数字产品变现",
      "中英文双语版本",
      "Markdown / PDF / Notion 可整理格式",
      "可直接复制使用",
      "后续持续更新"
    ],
    fitTitle: "适合谁 / 不适合谁",
    fitUsers: [
      "AI 工具站运营者",
      "自媒体创作者",
      "电商、闲鱼、淘宝卖家",
      "SEO/GEO 内容运营",
      "想做 AI 副业的人"
    ],
    notFitUsers: [
      "想要一键暴富的人",
      "不愿意自己执行测试的人",
      "完全不愿意改文案的人"
    ],
    pricingTitle: "验证阶段价格测试",
    pricingIntro: "以下价格只用于验证付费意愿，不代表最终正式价格。",
    pricingTiers: [
      { name: "免费样例包", price: "0 元", description: "5 个高频 Prompt 样例，用于确认是否值得继续试用。" },
      { name: "入门模板包", price: "19 元", description: "适合先解决产品介绍、SEO 标题和发布文案。" },
      { name: "完整模板包", price: "49 元", description: "覆盖 100+ 模板和中英文双语版本。" },
      { name: "商业场景包", price: "99 元", description: "面向具体项目、上架渠道和 AI 工具开发规划。" }
    ],
    scenariosTitle: "具体能解决什么",
    scenarios: [
      "不会写产品介绍时，快速生成更清楚的卖点和使用场景。",
      "不会写 SEO/GEO 内容时，先生成页面结构、标题、描述和 FAQ。",
      "不会写小红书、闲鱼、淘宝发布文案时，先得到可审核草稿。",
      "不会设计 AI 工具开发提示词时，把想法整理成需求和验收标准。",
      "不知道怎么把 AI 用到副业项目里时，用模板把执行步骤拆清楚。"
    ],
    faq: [
      ["这套 Prompt 包适合谁？", "适合已经有 AI 工具、数字产品、内容方向或电商上架需求，但缺少可复制文案结构的人。"],
      ["免费样例会包含什么？", "包含产品介绍、SEO 标题/描述、小红书笔记、闲鱼商品文案和 AI 工具开发需求 5 个高频 Prompt。"],
      ["完整包是否已经最终定价？", "没有。0/19/49/99 元只是验证阶段价格测试，用于观察真实咨询和付费意愿。"],
      ["会承诺排名、流量或收益吗？", "不会。模板只是效率辅助，结果需要人工审核和真实执行，不保证收益、平台流量或订单。"],
      ["是否适合非技术用户？", "适合。文档会用可复制、可替换变量的方式组织，不要求会写代码。"],
      ["如何判断这次验证是否成功？", "只看真实页面访问、CTA 点击、咨询、订单、收入、退款和用户反馈，不用主观感觉判断。"]
    ],
    compliance:
      "合规提示：模板仅作为效率辅助，结果需要人工审核；不保证收益，不承诺平台流量、排名或订单。所有浏览、点击、咨询、订单、收入、退款和用户反馈都必须真实发生后再记录。",
    contactNote: "邮件咨询时建议说明：你的项目类型、准备发布的平台、最想先解决的文案问题。"
  },
  en: {
    metaTitle: "ENHE AI Prompt Kit | Prompt Templates for AI Operators",
    metaDescription:
      "A validation page for a practical AI Prompt Kit covering product copy, SEO/GEO, product listings, AI tool planning, digital product launch copy, free sample prompts, and pricing validation.",
    eyebrow: "AI Prompt Kit Validation",
    title: "Prompt templates for product copy, SEO content, listings, and AI tool planning",
    subtitle:
      "For digital product builders, AI creators, and SEO operators who need clearer copy, launch drafts, and repeatable AI workflows.",
    primaryCta: "Get 5 free sample prompts",
    secondaryCta: "Try the full prompt pack",
    tertiaryCta: "Get prompts for my project",
    previewTitle: "Free sample prompts",
    previewIntro: "Start with five practical prompts before deciding whether the full pack is useful.",
    samplePrompts: [
      {
        title: "Product intro prompt",
        description: "Turn a product name, audience, features, and use case into a publishable product intro."
      },
      {
        title: "SEO title and description prompt",
        description: "Generate testable titles and meta descriptions from keywords, intent, and page type."
      },
      {
        title: "Social launch note prompt",
        description: "Draft a save-worthy note for creators and side-project builders."
      },
      {
        title: "Product listing prompt",
        description: "Create listing copy with delivery scope, refund boundaries, and compliance notes."
      },
      {
        title: "AI tool planning prompt",
        description: "Convert an AI product idea into users, features, pages, data, and acceptance criteria."
      }
    ],
    deliverablesTitle: "Full pack deliverables",
    deliverablesIntro: "The validation stage tests real demand before turning this into a larger product.",
    deliverables: [
      "100+ prompt templates",
      "Content creation / SEO / GEO / product listings / AI tool planning / private traffic / digital product launch",
      "Chinese and English versions",
      "Markdown / PDF / Notion-ready organization",
      "Copy-ready templates",
      "Ongoing updates"
    ],
    fitTitle: "Who it fits / who it does not fit",
    fitUsers: [
      "AI tool operators",
      "Digital product creators",
      "SEO/GEO operators",
      "Marketplace sellers",
      "Builders testing AI side projects"
    ],
    notFitUsers: [
      "People expecting guaranteed income",
      "People who do not want to run real tests",
      "People who refuse to review or rewrite copy"
    ],
    pricingTitle: "Pricing validation",
    pricingIntro: "These are validation-stage price points, not final public pricing.",
    pricingTiers: [
      { name: "Free sample pack", price: "CNY 0", description: "Five practical prompts to judge fit." },
      { name: "Starter pack", price: "CNY 19", description: "For product intro, SEO copy, and launch drafts." },
      { name: "Full template pack", price: "CNY 49", description: "100+ bilingual templates organized for direct use." },
      { name: "Business scenario pack", price: "CNY 99", description: "For specific projects, listing channels, and AI tool planning." }
    ],
    scenariosTitle: "What it helps you create",
    scenarios: [
      "Turn a vague product idea into clear value proposition copy.",
      "Draft SEO/GEO titles, descriptions, page outlines, and FAQ blocks.",
      "Prepare product listing drafts for manual review before publishing.",
      "Plan AI tool requirements with users, flows, data, and acceptance checks.",
      "Run a small digital product launch without starting from a blank page."
    ],
    faq: [
      ["Who is this for?", "It is for AI creators, digital product builders, marketplace sellers, and SEO operators who need reusable copy and planning prompts."],
      ["What is included in the free sample?", "Five sample prompts for product intros, SEO metadata, social launch notes, product listings, and AI tool planning."],
      ["Is the pricing final?", "No. CNY 0/19/49/99 are pricing validation points used to observe real interest and purchase intent."],
      ["Does it promise rankings or revenue?", "No. Templates are productivity aids. Human review is required, and there is no income, traffic, ranking, or order guarantee."],
      ["Is it useful for non-technical users?", "Yes. The prompts are written as copy-ready blocks with replaceable variables."],
      ["How will validation be judged?", "By real page views, CTA clicks, inquiries, orders, revenue, refunds, and user feedback only."]
    ],
    compliance:
      "Compliance note: templates are productivity aids only and require human review. No income, platform traffic, ranking, or order guarantee is made. Real clicks, inquiries, orders, revenue, refunds, and feedback must be recorded only after they happen.",
    contactNote: "When emailing, include your product type, target platform, and the copy problem you want to solve first."
  }
} as const;

export function generateValidationAiPromptKitMetadata(locale: Locale) {
  const copy = content[locale];
  return buildPageMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: "/validation/ai-prompt-kit",
    locale: locale === "en" ? "en_US" : "zh_CN",
    localeKey: locale
  });
}

export function ValidationAiPromptKitPage({ locale }: { locale: Locale }) {
  const copy = content[locale];
  const validationPath = buildLocalePath("/validation/ai-prompt-kit", locale);
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: locale === "en" ? "Home" : "首页", path: buildLocalePath("/", locale) },
      { name: copy.title, path: validationPath }
    ]
  });
  const faqSchema = buildFaqSchema({
    items: copy.faq.map(([question, answer]) => ({ question, answer }))
  });
  const mailHref = `mailto:${supportEmail}?subject=${encodeURIComponent(copy.title)}`;

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, faqSchema]} />

        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <Badge>{copy.eyebrow}</Badge>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-normal text-[var(--marketing-text)] md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--marketing-muted)] md:text-lg">
              {copy.subtitle}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <TrackedCta href={mailHref} surface="hero_free_sample" primary>
                {copy.primaryCta}
              </TrackedCta>
              <TrackedCta href="#deliverables" surface="hero_full_pack">
                {copy.secondaryCta}
              </TrackedCta>
              <TrackedCta href={mailHref} surface="hero_project_prompt">
                {copy.tertiaryCta}
              </TrackedCta>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <Image
                src="/images/brand/enhe-icon-gradient-white-bg-cropped.png"
                alt="ENHE AI"
                width={64}
                height={64}
                className="rounded-2xl"
                unoptimized
              />
              <div>
                <p className="text-sm font-bold text-[var(--marketing-accent)]">
                  {locale === "en" ? "Prompt pack preview" : "模板包预览"}
                </p>
                <p className="mt-1 text-sm text-[var(--marketing-muted)]">
                  Markdown / PDF / Notion
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {copy.samplePrompts.slice(0, 3).map((item) => (
                <article key={item.title} className="rounded-xl border border-white/10 bg-white/8 p-4">
                  <h2 className="text-sm font-black text-[var(--marketing-text)]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="free-samples" className="glass mt-10 scroll-mt-24 rounded-2xl p-7">
          <SectionTitle title={copy.previewTitle} intro={copy.previewIntro} />
          <div className="grid gap-4 md:grid-cols-2">
            {copy.samplePrompts.map((item) => (
              <article key={item.title} className="rounded-xl border border-white/10 bg-white/8 p-5">
                <h2 className="text-base font-black text-[var(--marketing-text)]">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="glass rounded-2xl p-7">
            <SectionTitle title={copy.scenariosTitle} />
            <SimpleList items={copy.scenarios} />
          </div>
          <div id="deliverables" className="glass scroll-mt-24 rounded-2xl p-7">
            <SectionTitle title={copy.deliverablesTitle} intro={copy.deliverablesIntro} />
            <div className="grid gap-3 sm:grid-cols-2">
              {copy.deliverables.map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/8 p-4 text-sm leading-6 text-[var(--marketing-muted)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass mt-10 rounded-2xl p-7">
          <SectionTitle title={copy.fitTitle} />
          <div className="grid gap-5 md:grid-cols-2">
            <InfoList title={locale === "en" ? "Best fit" : "适合"} items={copy.fitUsers} />
            <InfoList title={locale === "en" ? "Not a fit" : "不适合"} items={copy.notFitUsers} />
          </div>
        </section>

        <section id="price-test" className="glass mt-10 scroll-mt-24 rounded-2xl p-7">
          <SectionTitle title={copy.pricingTitle} intro={copy.pricingIntro} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {copy.pricingTiers.map((tier) => (
              <article key={tier.name} className="rounded-xl border border-white/10 bg-white/8 p-5">
                <p className="text-sm font-bold text-[var(--marketing-accent)]">{tier.name}</p>
                <p className="mt-3 text-2xl font-black text-[var(--marketing-text)]">{tier.price}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--marketing-muted)]">{tier.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass mt-10 rounded-2xl p-7">
          <SectionTitle title="FAQ" />
          <div className="grid gap-4 md:grid-cols-2">
            {copy.faq.map(([question, answer]) => (
              <article key={question} className="rounded-xl border border-white/10 bg-white/8 p-5">
                <h2 className="text-base font-black text-[var(--marketing-text)]">{question}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact-note" className="glass mt-10 rounded-2xl p-7">
          <SectionTitle title={locale === "en" ? "Compliance and next step" : "合规提示与下一步"} intro={copy.compliance} />
          <p className="text-sm leading-7 text-[var(--marketing-muted)]">{copy.contactNote}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <TrackedCta href={mailHref} surface="bottom_free_sample" primary>
              {copy.primaryCta}
            </TrackedCta>
            <TrackedCta href={mailHref} surface="bottom_project_prompt">
              {copy.tertiaryCta}
            </TrackedCta>
          </div>
        </section>
      </Container>
    </main>
  );
}

function TrackedCta({
  href,
  surface,
  primary = false,
  children
}: {
  href: string;
  surface: string;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "cursor-target inline-flex min-h-11 items-center justify-center rounded-full border border-[#050505] bg-[#050505] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(0,0,0,0.22)] transition hover:bg-[#161616]"
          : "cursor-target inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-bold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
      }
      data-analytics-event="validation_ai_prompt_kit_cta_click"
      data-analytics-entity-type="validation_offer"
      data-analytics-entity-id="ai-prompt-kit"
      data-analytics-meta-surface={surface}
    >
      {children}
    </Link>
  );
}

function InfoList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
      <h2 className="text-lg font-black text-[var(--marketing-text)]">{title}</h2>
      <SimpleList items={items} />
    </div>
  );
}

function SimpleList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--marketing-muted)]">
      {items.map((item) => (
        <li key={item}>- {item}</li>
      ))}
    </ul>
  );
}
