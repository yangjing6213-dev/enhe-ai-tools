import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const navigation = vi.hoisted(() => ({ pathname: null as string | null }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string }) =>
    React.createElement("a", { ...props, href: String(href) }, children),
}));

import { AdminNav } from "./admin-nav";

const items = [
  ["dashboard", "/admin"],
  ["aiNews", "/admin/ai-news"],
  ["aiNewsTopics", "/admin/ai-news/topics"],
  ["aiNewsKeywords", "/admin/ai-news/keywords"],
  ["settings", "/admin/settings"],
] as const;

const labels = {
  dashboard: "仪表盘",
  aiNews: "AI 资讯",
  aiNewsTopics: "资讯专题",
  aiNewsKeywords: "关键词",
  settings: "设置",
};

function renderNav(pathname: string | null) {
  navigation.pathname = pathname;
  return renderToStaticMarkup(
    React.createElement(AdminNav, {
      items,
      labels,
      ariaLabel: "后台导航",
    }),
  );
}

function activeLinks(markup: string) {
  return markup.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? [];
}

describe("AdminNav active route selection", () => {
  it.each([
    ["root", "/admin", "/admin"],
    ["fallback root", null, "/admin"],
    ["AI News exact route", "/admin/ai-news", "/admin/ai-news"],
    ["nested AI News content", "/admin/ai-news/article-123", "/admin/ai-news"],
    [
      "nested topic editor",
      "/admin/ai-news/topics/topic-123/edit",
      "/admin/ai-news/topics",
    ],
    [
      "sibling keyword editor",
      "/admin/ai-news/keywords/topic",
      "/admin/ai-news/keywords",
    ],
    ["non-prefix sibling", "/admin/ai-newsletter", null],
    ["unknown route", "/admin/missing", null],
  ] as const)("marks only the expected route active for $0", (_name, pathname, expectedHref) => {
    const markup = renderNav(pathname);
    const active = activeLinks(markup);

    expect(active).toHaveLength(expectedHref ? 1 : 0);
    if (expectedHref) {
      expect(active[0]).toContain(`href="${expectedHref}"`);
    }
  });

  it("preserves every navigation item and its provided label", () => {
    const markup = renderNav("/admin/ai-news/topics");

    for (const [key, href] of items) {
      expect(markup).toContain(`href="${href}"`);
      expect(markup).toContain(labels[key]);
    }
    expect(markup).toContain('aria-label="后台导航"');
  });
});
