import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiPromptManagementPageShell } from "@/app/skill-learning/ai-prompt-management/page-shell";

Object.assign(globalThis, { React });
const qrValues = vi.hoisted(() => [] as string[]);
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => {
    qrValues.push(value);
    return <svg />;
  },
}));
afterEach(() => { vi.unstubAllEnvs(); qrValues.length = 0; });

describe("standalone prompt library sharing", () => {
  it.each([
    ["zh", "/skill-learning/ai-prompt-management", "分享此产品", "复制产品链接"],
    ["en", "/en/skill-learning/ai-prompt-management", "Share this product", "Copy product link"],
  ] as const)("shares the %s library after its existing content", (locale, path, label, button) => {
    vi.stubEnv("APP_URL", "https://www.enhe-tech.com.cn");
    const html = renderToStaticMarkup(<AiPromptManagementPageShell forceLocale={locale} />);
    expect(qrValues).toEqual([`https://www.enhe-tech.com.cn${path}`]);
    const shareIndex = html.indexOf(`aria-label="${label}"`);
    expect(shareIndex).toBeGreaterThan(html.indexOf(">FAQ<"));
    expect(html.slice(shareIndex)).toContain(button);
    expect(html.slice(shareIndex)).not.toContain("https://www.enhe-tech.com.cn");
    expect(html).not.toContain('id="tool-changelog"');
  });
});
