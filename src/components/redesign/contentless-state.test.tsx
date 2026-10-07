import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

Object.assign(globalThis, { React });

import { ContentlessState } from "@/components/redesign/contentless-state";

describe("contentless public shell", () => {
  it("renders a localized, accessible empty surface with safe actions", () => {
    const html = renderToStaticMarkup(
      <ContentlessState
        locale="zh"
        className="ai-news-page"
        eyebrow="AI 前沿资讯"
        title="AI 前沿资讯"
        intro="内容准备中，页面结构和导航仍然可用。"
        statusLabel="UNVERIFIED"
        statusText="AI 资讯内容尚未核验。"
        primaryAction={{ href: "/", label: "返回首页" }}
        secondaryActions={[{ href: "/software", label: "浏览 AI 软件" }]}
      />,
    );

    expect(html).toContain('data-content-status="UNVERIFIED"');
    expect(html).toContain('data-shell-state="contentless"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("AI 资讯内容尚未核验");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/software"');
    expect(html).toContain("<h1");
    expect(html).not.toContain("CollectionPage");
    expect(html).not.toContain("ItemList");
    const statusStart = html.indexOf('role="status"');
    const statusEnd = html.indexOf("</section>", statusStart);
    const actionsStart = html.indexOf('class="enhe-contentless-actions"');
    expect(actionsStart).toBeGreaterThan(statusEnd);
  });

  it("keeps English shell copy free of Chinese characters", () => {
    const html = renderToStaticMarkup(
      <ContentlessState
        locale="en"
        eyebrow="AI News"
        title="AI News"
        intro="The public shell is ready while verified content is prepared."
        statusLabel="UNVERIFIED"
        statusText="AI News content has not been verified yet."
        primaryAction={{ href: "/en", label: "Return home" }}
      />,
    );

    expect(html).not.toMatch(/[\u3400-\u9fff]/);
    expect(html).toContain('href="/en"');
    expect(html).toContain("AI News content has not been verified yet.");
  });
});
