import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public navigation performance source contract", () => {
  it("provides a client-side internal link that warms routes without changing hrefs or SEO markup", () => {
    const source = readFileSync(new URL("../components/prefetch-link.tsx", import.meta.url), "utf8");

    expect(source).toContain('"use client"');
    expect(source).toContain('import Link from "next/link"');
    expect(source).toContain('useRouter');
    expect(source).toContain('router.prefetch(href)');
    expect(source).toContain('onMouseEnter={(event) =>');
    expect(source).toContain('onFocus={(event) =>');
    expect(source).toContain('onTouchStart={(event) =>');
    expect(source.match(/handleWarmup\(\);/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('onMouseEnter?.(event)');
    expect(source).toContain('onFocus?.(event)');
    expect(source).toContain('onTouchStart?.(event)');
    expect(source).toContain('<Link');
    expect(source).toContain('href={href}');
  });

  it("uses prefetch-capable links for high-traffic public navigation surfaces", () => {
    const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");
    const mobileNav = readFileSync(new URL("../components/mobile-nav-menu.tsx", import.meta.url), "utf8");
    const toolCard = readFileSync(new URL("../components/tool-card.tsx", import.meta.url), "utf8");
    const ui = readFileSync(new URL("../components/ui.tsx", import.meta.url), "utf8");

    for (const source of [header, footer, mobileNav, toolCard, ui]) {
      expect(source).toContain('PrefetchLink');
    }

    expect(header).toContain('<PrefetchLink href={buildLocalePath("/", locale)}');
    expect(header).toContain('<PrefetchLink key={href} href={href}');
    expect(toolCard).toContain('<PrefetchLink href={buildCanonicalToolPath(tool, locale)}');
    expect(ui).toContain('<PrefetchLink');
  });

  it("keeps global pointer effects idle unless they are visible and useful", () => {
    const cursor = readFileSync(new URL("../components/cursor-glow.tsx", import.meta.url), "utf8");
    const background = readFileSync(new URL("../components/interactive-background.tsx", import.meta.url), "utf8");

    expect(cursor).toContain('startFrameLoop');
    expect(cursor).toContain('stopFrameLoop');
    expect(cursor).toContain('document.addEventListener("visibilitychange"');
    expect(cursor).toContain('window.setTimeout');
    expect(cursor).not.toContain('frameRef.current = window.requestAnimationFrame(tick);\n      } else if');
    expect(background).toContain('window.matchMedia("(pointer: fine)")');
    expect(background).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(background).toContain('window.requestAnimationFrame');
  });
});
