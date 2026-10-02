import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui";
import { ContentlessState } from "@/components/redesign/contentless-state";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getAiNewsTopicCopy, getAiNewsTopicPath } from "@/lib/ai-news-topics";
import { buildLocalePath, buildPageMetadata } from "@/lib/seo";

export function generateAiNewsTopicsMetadata(locale: Locale) {
  const t = getDictionary(locale);
  const dbFree = !process.env.DATABASE_URL?.trim();
  return {
    ...buildPageMetadata({
      title: t.aiNews.topicsTitle,
      description: dbFree ? t.aiNews.dbFreeTopicMetaDescription : t.aiNews.intro,
      path: "/ai-news/topics",
      locale: locale === "en" ? "en_US" : "zh_CN",
      localeKey: locale,
      languageAlternates: { zh: "/ai-news/topics", en: "/en/ai-news/topics" },
    }),
    ...(dbFree ? { robots: { index: false, follow: true } } : {}),
  };
}

export async function AiNewsTopicsPageShell({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  if (!process.env.DATABASE_URL?.trim()) {
    return (
      <ContentlessState
        className="ai-news-page ai-news-workspace enhe-reference-workspace ai-news-topics-page"
        locale={locale}
        eyebrow={t.aiNews.title}
        title={t.aiNews.topicsTitle}
        intro={t.aiNews.intro}
        statusLabel={locale === "en" ? "Unverified" : "待核验"}
        stateTitle={t.aiNews.dbFreeTopicPreviewLabel}
        statusText={t.aiNews.dbFreeTopicPreviewText}
        primaryAction={{ href: buildLocalePath("/ai-news", locale), label: t.aiNews.latestTitle }}
      />
    );
  }

  const { getPublicAiNewsTopics } = await import("@/lib/public-content");
  const topics = await getPublicAiNewsTopics();
  return (
    <main className="ai-news-page ai-news-workspace enhe-reference-workspace ai-news-topics-page">
      <Container className="ai-news-workspace-container py-8 md:py-12">
        <header className="enhe-contentless-hero">
          <div className="enhe-contentless-hero-copy">
            <p className="enhe-contentless-eyebrow">{t.aiNews.title}</p>
            <h1>{t.aiNews.topicsTitle}</h1>
            <p className="enhe-contentless-intro">{t.aiNews.intro}</p>
          </div>
        </header>
        {topics.length > 0 ? (
          <nav aria-label={t.aiNews.topicsTitle} className="grid gap-3">
            {topics.map((topic) => {
              const copy = getAiNewsTopicCopy(topic, locale);
              return (
                <Link key={topic.slug} href={getAiNewsTopicPath(topic.slug, locale)} className="rounded-xl border border-[var(--marketing-border)] bg-[var(--marketing-card)] p-5 text-[var(--marketing-text)] transition-colors hover:border-[var(--marketing-accent)]">
                  <h2 className="text-lg font-bold">{copy.title}</h2>
                  <p className="mt-2 text-sm text-[var(--marketing-muted)]">{copy.description}</p>
                </Link>
              );
            })}
          </nav>
        ) : (
          <section className="surface-panel p-8 text-center">
            <div role="status" aria-live="polite">
              <h2 className="text-lg font-bold text-[var(--marketing-text)]">{t.aiNews.emptyTopicsTitle}</h2>
              <p className="mt-2 text-sm text-[var(--marketing-muted)]">{t.aiNews.emptyTopicsText}</p>
            </div>
            <Link href={buildLocalePath("/ai-news", locale)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--marketing-accent)] px-5 font-semibold text-[var(--marketing-accent)] underline-offset-4 hover:underline">
              {t.aiNews.latestTitle}
            </Link>
          </section>
        )}
      </Container>
    </main>
  );
}
