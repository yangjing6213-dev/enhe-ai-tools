import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { Container, SectionTitle } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPublicTutorials } from "@/lib/public-content";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { buildBreadcrumbSchema, buildListingMetaDescription, buildMetadataTitle, buildPageMetadata } from "@/lib/seo";

export const tutorialsPageRevalidate = publicPageCacheSeconds;

export async function generateTutorialsPageMetadata(forceLocale: Locale): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  return buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: t.tutorials.title, brand: t.brand }),
    description: buildListingMetaDescription("tutorials", forceLocale),
    path: "/tutorials",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale
  });
}

export async function TutorialsPageShell({ forceLocale }: { forceLocale: Locale }) {
  const tutorials = await getPublicTutorials();
  const t = getDictionary(forceLocale);
  const tutorialGuidance =
    forceLocale === "en"
      ? {
          title: "How to use ENHE AI tutorials",
          workflowSteps: "Start from the matching tool page, read the setup notes, follow the ordered steps, then return to the tool detail page for downloads, account-service guidance, or related courses.",
          commonErrors: "When a workflow does not behave as expected, check version requirements, login state, file permissions, model limits, and platform policy changes before repeating the same step.",
          relatedTools: "Each tutorial links back to its related software, account service, or skill course so you can move from learning to execution without losing context."
        }
      : {
          title: "如何使用 ENHE AI 教程",
          workflowSteps: "建议先从对应工具详情页开始，阅读安装与准备说明，再按教程步骤执行，最后回到详情页查看下载、账号服务建议或相关课程。",
          commonErrors: "如果流程执行不符合预期，优先检查版本要求、登录状态、文件权限、模型额度和平台政策变化，再决定是否重新操作。",
          relatedTools: "每篇教程都会关联对应的软件应用、账号服务或技能课程，方便你从学习自然进入实际使用。"
        };
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: t.nav.home, path: forceLocale === "en" ? "/en" : "/" },
      { name: t.tutorials.title, path: forceLocale === "en" ? "/en/tutorials" : "/tutorials" }
    ]
  });

  return (
    <Container className="py-14">
      <StructuredData data={breadcrumbSchema} />
      <SectionTitle as="h1" title={t.tutorials.title} intro={t.tutorials.intro} />
      <section className="surface-panel mb-8 p-6">
        <h2 className="text-2xl font-semibold text-[var(--marketing-text)]">{tutorialGuidance.title}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { title: forceLocale === "en" ? "Workflow steps" : "学习路径", text: tutorialGuidance.workflowSteps },
            { title: forceLocale === "en" ? "Common errors" : "常见问题", text: tutorialGuidance.commonErrors },
            { title: forceLocale === "en" ? "Related tools" : "关联工具", text: tutorialGuidance.relatedTools }
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <h3 className="font-semibold text-[var(--marketing-text)]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        {tutorials.map((tutorial) => (
          <Link key={tutorial.id} href={buildCanonicalToolPath(tutorial.tool, forceLocale)} className="surface-panel p-6 transition hover:-translate-y-1 hover:border-[var(--marketing-accent)]/45">
            <p className="text-sm font-semibold text-[var(--marketing-accent)]">{tutorial.tool.name}</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--marketing-text)]">{tutorial.title}</h2>
            <p className="mt-3 line-clamp-3 leading-7 text-[var(--marketing-muted)]">{tutorial.content}</p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
