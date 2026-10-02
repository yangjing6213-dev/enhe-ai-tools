import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiNewsWorkspaceShell } from "@/components/redesign/ai-news-workspace-shell";

Object.assign(globalThis, { React });
const content = vi.hoisted(() => ({ loaded: vi.fn(), topics: vi.fn() }));
vi.mock("@/lib/public-content", () => {
  content.loaded();
  return { getPublicAiNewsTopics: content.topics };
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  content.topics.mockReset();
  vi.stubEnv("DATABASE_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("AI News topics collection entry", () => {
  it.each(["zh", "en"] as const)("keeps one localized section navigation (%s)", (locale) => {
    const path = `${locale === "en" ? "/en" : ""}/ai-news/topics`;
    const html = renderToStaticMarkup(<AiNewsWorkspaceShell locale={locale} currentPathname={path}>Collection</AiNewsWorkspaceShell>);
    expect(html.match(/<nav\b/g)).toHaveLength(1);
    expect(html.match(new RegExp(`href="${path}" aria-current="page"`, "g"))).toHaveLength(1);
    expect(html).not.toContain("ai-news-reference-topbar");
    expect(html).not.toContain("ai-news-reference-language-link");
    expect(html).not.toContain('href="/login"');
    expect(html).not.toContain('href="/en/login"');
  });

  it.each(["zh", "en"] as const)("marks section ancestors as locations on detail routes (%s)", (locale) => {
    const prefix = locale === "en" ? "/en" : "";
    const path = `${prefix}/ai-news/topics/fixture-topic`;
    const topicsHref = `${prefix}/ai-news/topics`;
    const html = renderToStaticMarkup(<AiNewsWorkspaceShell locale={locale} currentPathname={path}>Detail</AiNewsWorkspaceShell>);

    expect(html).toContain(`href="${topicsHref}" aria-current="location"`);
    expect(html).not.toContain(`href="${topicsHref}" aria-current="page"`);
  });

  it.each(["zh", "en"] as const)("renders a noindex empty collection without loading data code (%s)", async (locale) => {
    const { AiNewsTopicsPageShell, generateAiNewsTopicsMetadata } = await import("@/app/ai-news/topics/page-shell");
    const html = renderToStaticMarkup(await AiNewsTopicsPageShell({ locale }));
    const metadata = generateAiNewsTopicsMetadata(locale);
    expect(html).toContain('data-content-status="UNVERIFIED"');
    expect(html).toContain(
      `<span class="enhe-contentless-status-label">${locale === "en" ? "Unverified" : "待核验"}</span>`,
    );
    expect(html).toContain(locale === "en" ? "Topic Collections" : "专题合集");
    expect(html).not.toContain("/topics/ai-agent");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(content.loaded).not.toHaveBeenCalled();
    expect(content.topics).not.toHaveBeenCalled();
  });

  it.each(["zh", "en"] as const)("uses the existing configured topic reader and localized links (%s)", async (locale) => {
    vi.stubEnv("DATABASE_URL", "postgresql://fixture.invalid/local-test");
    content.topics.mockResolvedValue([{ slug: "fixture-topic", zh: { title: "测试专题", description: "测试说明" }, en: { title: "Fixture topic", description: "Fixture description" } }]);
    const { AiNewsTopicsPageShell } = await import("@/app/ai-news/topics/page-shell");
    const page = await AiNewsTopicsPageShell({ locale });
    const html = renderToStaticMarkup(
      <AiNewsWorkspaceShell
        locale={locale}
        currentPathname={`${locale === "en" ? "/en" : ""}/ai-news/topics`}
      >
        {page}
      </AiNewsWorkspaceShell>,
    );
    expect(content.topics).toHaveBeenCalledOnce();
    expect(html).toContain(`href="${locale === "en" ? "/en" : ""}/ai-news/topics/fixture-topic"`);
    expect(html).toContain(locale === "en" ? "Fixture topic" : "测试专题");
    expect(html.match(/<header\b/g)).toHaveLength(1);
    expect(html.match(/class="ai-news-section-nav"/g)).toHaveLength(1);
    expect(html).toContain('<header class="enhe-contentless-hero">');
    expect(html).not.toContain('role="banner"');
  });

  it.each(["zh", "en"] as const)("shows a localized empty state when no configured topics exist (%s)", async (locale) => {
    vi.stubEnv("DATABASE_URL", "postgresql://fixture.invalid/local-test");
    content.topics.mockResolvedValue([]);
    const { AiNewsTopicsPageShell } = await import("@/app/ai-news/topics/page-shell");
    const html = renderToStaticMarkup(await AiNewsTopicsPageShell({ locale }));

    expect(html).toContain(locale === "en" ? "No AI News topics are available yet" : "暂无已发布的AI资讯专题");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    const statusStart = html.indexOf('role="status"');
    const statusEnd = html.indexOf("</div>", statusStart);
    const recoveryActionStart = html.indexOf(
      `href="${locale === "en" ? "/en" : ""}/ai-news`,
      statusStart,
    );
    expect(recoveryActionStart).toBeGreaterThan(statusEnd);
    expect(html).toContain(`href="${locale === "en" ? "/en" : ""}/ai-news"`);
    expect(content.topics).toHaveBeenCalledOnce();
  });
});
