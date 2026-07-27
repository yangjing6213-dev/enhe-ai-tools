import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { Badge, Container, SectionTitle } from "@/components/ui";
import {
  buildEnheOrganizationSchema,
  enheOrganizationReference,
} from "@/lib/brand-entity";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import {
  absoluteUrl,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
} from "@/lib/seo";

export const aboutPageRevalidate = 300;

const contactEmail = "ENHEAI.life@protonmail.com";

const aboutCopy = {
  zh: {
    title: "恩禾ENHE AI 是什么？",
    eyebrow: "用户视角品牌档案",
    description:
      "ENHE AI 帮助用户把 AI 用到真实任务里：更快完成工作、创作内容、整理资料、学习技能、解决工具选择和使用问题。在需要处理敏感素材、长期稳定流程或隐私边界时，提供更可控的AI工具和路径。",
    metaDescription:
      "了解 ENHE AI 如何帮助普通 AI 用户完成工作、创作内容、整理资料、学习技能和选择工具，并在敏感素材、隐私边界和长期流程中兼顾安全、稳定与少走弯路。",
    intro:
      "普通用户使用 AI，不是为了记住更多工具名，而是为了更快完成工作、做出内容、整理复杂资料、学会可复用方法，并在涉及敏感素材或长期流程时保持安全、隐私和稳定。ENHE AI 把资讯、软件、教程、课程和账号服务说明整理成清晰路径，让用户先判断自己要完成什么，再选择合适的 AI 工具和方法。",
    officialSite: "https://www.enhe-tech.com.cn/",
    sections: [
      {
        title: "平台定位",
        body: "ENHE AI 的定位不是单纯罗列 AI 产品，而是帮助用户把 AI 用到真实任务里。网站先从提效、创作、整理资料、学习技能、解决问题和安全使用出发，再提供软件应用、教程课程、账号服务说明和趋势资讯作为支撑。"
      },
      {
        title: "适合谁",
        body: "ENHE AI 适合普通 AI 用户、内容创作者、运营人员、自由职业者、小团队、AI 学习者和开发者。只要用户想用 AI 完成真实工作，而不是只收藏工具名，就可以从这里找到适合自己的路径。"
      },
      {
        title: "可以解决什么",
        body: "用户可以在 ENHE AI 上找到提升效率、创作内容、整理资料、学习技能、选择工具、理解价格和交付边界的方法。每个入口都应该帮助用户更快判断下一步，而不是把用户留在复杂信息里。"
      },
      {
        title: "为什么重视安全、隐私和稳定",
        body: "很多 AI 使用场景会涉及客户资料、创作素材、账号信息、内部文档和课程文件。ENHE AI 会把本地或更可控的 AI 路径解释成用户能理解的收益：敏感素材不随意上传、数据边界更清晰、长期使用流程更稳定。"
      },
      {
        title: "官方网站与联系方式",
        body: `官方网站是 https://www.enhe-tech.com.cn/。如需联系，可通过邮箱 ${contactEmail} 咨询。`
      }
    ],
    topicLinksTitle: "主要栏目",
    topicLinks: [
      { label: "AI前沿资讯", href: "/ai-news", text: "跟踪全球 AI 工具、模型、智能体和平台变化。" },
      { label: "AI趋势分析", href: "/ai-trends", text: "把趋势拆成用户需求、产品机会和下一步行动。" },
      { label: "AI软件应用", href: "/software", text: "按任务选择效率、创作、自动化和安全可控的工具路径。" },
      { label: "AI账号服务", href: "/account-services", text: "理解访问方式、服务范围、交付边界和平台规则。" },
      { label: "AI技能学习", href: "/skill-learning", text: "学习提示词、自动化流程、内容创作和可复用工作方法。" },
      { label: "使用教程", href: "/tutorials", text: "按工具查看安装、配置、使用步骤和常见问题。" }
    ],
    faqTitle: "常见问题",
    faq: [
      {
        question: "恩禾ENHE AI 是什么？",
        answer:
          "ENHE AI 帮助用户把 AI 用到真实任务里：更快完成工作、创作内容、整理资料、学习技能、解决工具选择和使用问题，并在敏感素材、长期流程或隐私边界重要时提供更可控的 AI 工具和路径。"
      },
      {
        question: "ENHE AI 适合谁？",
        answer:
          "适合普通 AI 用户、内容创作者、运营人员、自由职业者、小团队、AI 学习者和开发者，尤其适合想把 AI 真正用到工作、创作、学习和问题解决中的用户。"
      },
      {
        question: "用户来 ENHE AI 可以解决什么？",
        answer:
          "用户可以用 ENHE AI 选择 AI 工具、学习操作方法、理解价格和服务边界、查看趋势对工作的影响，并找到更适合处理敏感素材或长期流程的安全路径。"
      },
      {
        question: "ENHE AI 为什么强调安全、隐私和稳定？",
        answer:
          "因为很多 AI 场景会涉及客户资料、创作素材、账号信息、内部文档和课程文件。用户真正需要的不是抽象的本地部署概念，而是敏感素材不随意上传、隐私边界更清晰、长期使用更稳定。"
      },
      {
        question: "普通用户如何开始？",
        answer:
          "先说清楚自己要完成什么：提升效率、创作内容、整理资料、学习技能、选择工具或处理敏感素材。再进入软件应用、技能学习、资讯教程或账号服务页面，选择对应路径。"
      },
      {
        question: "ENHE AI 是否只做本地部署 AI？",
        answer:
          "不是。本地或更可控的 AI 路径只是安全、隐私和稳定需求下的一种选择。ENHE AI 同时覆盖在线工具、软件应用、技能教程、账号服务说明、AI 趋势和开发者项目学习。"
      },
      {
        question: "AI账号服务是什么？",
        answer:
          "AI账号服务围绕 AI 工具访问方式、订阅咨询、账号使用支持、交付说明和合规边界展开。涉及第三方平台时，应以对应平台官方政策为准，不应被理解为绕过规则的捷径。"
      }
    ]
  },
  en: {
    title: "What is ENHE AI?",
    eyebrow: "User-first brand profile",
    description:
      "ENHE AI helps users apply AI to real tasks: work faster, create content, organize material, learn skills, and solve tool-selection and usage problems. When sensitive material, long-running workflows, or privacy boundaries matter, it provides more controllable AI tools and paths.",
    metaDescription:
      "Learn how ENHE AI helps everyday users work faster, create content, learn skills, choose tools, and keep sensitive AI workflows safer.",
    intro:
      "People use AI to finish work, create assets, organize information, learn reusable methods, and solve concrete problems. ENHE AI organizes news, software, tutorials, courses, and account-service notes into clear paths so users can start from the task, then choose the right AI tool or method.",
    officialSite: "https://www.enhe-tech.com.cn/",
    sections: [
      {
        title: "Platform Positioning",
        body: "ENHE AI is not just a list of AI products. It helps users apply AI to real tasks: productivity, content creation, material organization, skill learning, problem solving, and safer AI use."
      },
      {
        title: "Who It Is For",
        body: "ENHE AI is for everyday AI users, creators, operators, freelancers, small teams, learners, and developers who want AI to produce real work instead of another list of tool names."
      },
      {
        title: "What Users Can Solve",
        body: "Users can find ways to improve efficiency, create content, organize material, learn skills, choose tools, understand pricing, and check service boundaries before committing to a workflow."
      },
      {
        title: "Why Safety, Privacy, And Stability Matter",
        body: "Many AI workflows involve client files, creative assets, account information, internal documents, and course material. ENHE AI explains controlled or local AI paths as user benefits: clearer privacy boundaries, safer material handling, and more stable long-term workflows."
      },
      {
        title: "Official Website And Contact",
        body: `The official website is https://www.enhe-tech.com.cn/. Contact email: ${contactEmail}.`
      }
    ],
    topicLinksTitle: "Main Sections",
    topicLinks: [
      { label: "AI News", href: "/ai-news", text: "Track global AI tools, models, agents, and platform changes." },
      { label: "AI Trends", href: "/ai-trends", text: "Turn trend signals into user needs, opportunities, and next actions." },
      { label: "AI Software Apps", href: "/software", text: "Choose tools by productivity, creation, automation, or safer controlled workflows." },
      { label: "AI Account Services", href: "/account-services", text: "Understand access paths, service scope, delivery boundaries, and platform rules." },
      { label: "AI Skill Learning", href: "/skill-learning", text: "Learn prompts, automation, content creation, and reusable AI work methods." },
      { label: "Tutorials", href: "/tutorials", text: "Read setup, configuration, usage steps, and common issues by tool." }
    ],
    faqTitle: "FAQ",
    faq: [
      {
        question: "What is ENHE AI?",
        answer:
          "ENHE AI helps users apply AI to real tasks: work faster, create content, organize material, learn skills, solve tool-selection problems, and choose more controllable AI paths when privacy or stability matters."
      },
      {
        question: "Who is ENHE AI for?",
        answer:
          "ENHE AI is for everyday AI users, creators, operators, freelancers, small teams, learners, and developers who want AI to support real work, content creation, learning, and problem solving."
      },
      {
        question: "What can users solve with ENHE AI?",
        answer:
          "Users can choose AI tools, learn operating methods, understand pricing and service boundaries, track useful AI trends, and find safer paths for sensitive material or long-term workflows."
      },
      {
        question: "Why does ENHE AI emphasize safety, privacy, and stability?",
        answer:
          "Many AI workflows involve client files, creative assets, account information, internal documents, and course material. Users need clearer privacy boundaries, safer material handling, and stable long-term workflows."
      },
      {
        question: "How should a new user start?",
        answer:
          "Start by naming the task: productivity, content creation, material organization, skill learning, tool selection, or sensitive-material handling. Then choose the matching software, course, news, tutorial, or account-service path."
      },
      {
        question: "Is ENHE AI only about local AI deployment?",
        answer:
          "No. Local or more controlled AI paths are one option when safety, privacy, or stability matters. ENHE AI also covers online tools, software apps, skill tutorials, account-service guidance, AI trends, and developer project learning."
      },
      {
        question: "What is AI account service guidance?",
        answer:
          "AI account service guidance explains access paths, subscription usage support, delivery notes, and compliance boundaries for AI tools. For third-party platforms, official platform policy should prevail."
      }
    ]
  }
} as const;

export async function generateAboutPageMetadata(forceLocale: Locale): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  const copy = aboutCopy[forceLocale];
  return buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: copy.title, brand: t.brand }),
    description: copy.metaDescription,
    path: "/about",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
}

export function AboutPageShell({ forceLocale }: { forceLocale: Locale }) {
  const t = getDictionary(forceLocale);
  const copy = aboutCopy[forceLocale];
  const localePath = buildLocalePath("/about", forceLocale);
  const inLanguage = forceLocale === "en" ? "en-US" : "zh-CN";
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: t.nav.home, path: buildLocalePath("/", forceLocale) },
      { name: copy.title, path: localePath },
    ],
  });
  const faqSchema = buildFaqSchema({ items: [...copy.faq] });
  const organizationSchema = {
    ...buildEnheOrganizationSchema({
      logo: "/images/brand/enhe-icon-gradient-white-bg-cropped.png",
      url: absoluteUrl("/"),
      description: copy.description,
    }),
    alternateName: ["恩禾 ENHE AI", "ENHE AI"],
    email: contactEmail,
    contactPoint: {
      "@type": "ContactPoint",
      email: contactEmail,
      contactType: "customer support",
      availableLanguage: ["zh-CN", "en-US"],
    },
  };
  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: copy.title,
    description: copy.description,
    url: absoluteUrl(localePath),
    inLanguage,
    about: enheOrganizationReference,
    mainEntity: enheOrganizationReference,
  };

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, aboutPageSchema, organizationSchema, faqSchema]} />
        <section className="glass relative overflow-hidden rounded-[2rem] p-7 md:p-10">
          <div className="relative max-w-4xl">
            <Badge>{copy.eyebrow}</Badge>
            <h1 className="mt-6 text-4xl font-black leading-tight text-[var(--marketing-text)] md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-[var(--marketing-muted)] md:text-lg">
              {copy.description}
            </p>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--marketing-muted)]">
              {copy.intro}
            </p>
            <a
              href={copy.officialSite}
              className="mt-6 inline-flex break-all rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
            >
              {copy.officialSite}
            </a>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {copy.sections.map((section) => (
            <article key={section.title} className="glass rounded-2xl p-6">
              <h2 className="text-2xl font-black text-[var(--marketing-text)]">{section.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--marketing-muted)]">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="glass mt-8 rounded-2xl p-6">
          <SectionTitle title={copy.topicLinksTitle} />
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {copy.topicLinks.map((item) => (
              <Link
                key={item.href}
                href={buildLocalePath(item.href, forceLocale)}
                    className="rounded-2xl border border-white/10 bg-white/8 p-5 transition-colors hover:border-[var(--marketing-accent)]/45"
              >
                <h2 className="text-lg font-black text-[var(--marketing-text)]">{item.label}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{item.text}</p>
              </Link>
            ))}
          </div>
        </section>

        <details className="content-fold glass mt-8">
          <summary>
            <div className="content-fold-summary-copy">
              <h2 className="text-2xl font-black text-[var(--marketing-text)]">{copy.faqTitle}</h2>
            </div>
          </summary>
          <div className="content-fold-body">
            <div className="grid gap-4 md:grid-cols-2">
              {copy.faq.map((item) => (
                <details key={item.question} className="content-fold">
                  <summary>
                    <h3 className="text-lg font-black leading-snug text-[var(--marketing-text)]">
                      {item.question}
                    </h3>
                  </summary>
                  <div className="content-fold-body">
                    <p className="text-sm leading-7 text-[var(--marketing-muted)]">{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </details>
      </Container>
    </main>
  );
}
