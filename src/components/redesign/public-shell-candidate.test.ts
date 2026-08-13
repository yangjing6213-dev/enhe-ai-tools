import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function readCandidate(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("ENHE redesign public shell candidate", () => {
  it("defines the approved independent visual tokens without forbidden effects", () => {
    const tokens = readCandidate("styles/redesign/tokens.css");

    expect(tokens).toContain("--enhe-page-bg: #fdfdfd");
    expect(tokens).toContain("--enhe-text: #080808");
    expect(tokens).toContain("--enhe-action: #527e54");
    expect(tokens).toContain("--enhe-footer: #071512");
    expect(tokens).toContain("--enhe-focus: #ffd60a");
    expect(tokens).toContain("--enhe-motion-fast: 170ms");
    expect(tokens).toContain("--enhe-z-focus: 60");
    expect(tokens).not.toMatch(/gradient|glow|glass|glitch|neon/i);
  });

  it("keeps the approved desktop navigation order and explicit account boundary", () => {
    const header = readCandidate("components/redesign/enhe-redesign-header.tsx");
    const navigation = readCandidate("components/redesign/navigation.ts");

    const expectedOrder = [
      "AI工具",
      "AI Skill",
      "AI资讯",
      "AI趋势",
      "关于我们",
      "搜索",
    ];
    let lastIndex = -1;
    for (const label of expectedOrder) {
      const nextIndex = navigation.indexOf(label);
      expect(nextIndex, `missing or out-of-order label: ${label}`).toBeGreaterThan(lastIndex);
      lastIndex = nextIndex;
    }

    expect(header).toContain('languageAriaLabel = "中文 / EN"');
    expect(header.indexOf("EnheRedesignLanguageSwitch")).toBeLessThan(header.indexOf("account.loginLabel"));
    expect(header).toContain("account.isAdmin");
    expect(header).toContain("adminHref");
    expect(header).toContain("account.isAdmin ?");
    expect(header).not.toContain("getCurrentLocale");
    expect(header).not.toContain("prisma");
    expect(header).not.toContain("File.fileUrl");
    expect(header).not.toContain("File.filePath");
  });

  it("uses an explicit alternateHref for the language switch", () => {
    const languageSwitch = readCandidate("components/redesign/enhe-redesign-language-switch.tsx");

    expect(languageSwitch).toContain("alternateHref");
    expect(languageSwitch).toContain("href={alternateHref}");
    expect(languageSwitch).not.toContain("window.location");
    expect(languageSwitch).not.toContain("pathname");
  });

  it("implements an accessible mobile drawer with focus and scroll lifecycle", () => {
    const menu = readCandidate("components/redesign/enhe-redesign-mobile-menu.tsx");

    expect(menu).toContain('aria-expanded={open}');
    expect(menu).toContain("aria-controls={menuId}");
    expect(menu).toContain("Escape");
    expect(menu).toContain("focus()");
    expect(menu).toContain("previouslyFocusedElement");
    expect(menu).toContain("overflow");
    expect(menu).toContain("onClick={close}");
    expect(menu).toContain("aria-label={triggerLabel}");
  });

  it("keeps the footer as four flat semantic columns without shell duplication", () => {
    const footer = readCandidate("components/redesign/enhe-redesign-footer.tsx");

    for (const label of ["ENHE AI", "帮助与服务", "合规条款", "公司信息"]) {
      expect(footer).toContain(label);
    }
    expect(footer).toContain("footer-grid");
    expect(footer).not.toContain("AI工具");
    expect(footer).not.toContain("中文 / EN");
    expect(footer).not.toContain("电话");
    expect(footer).not.toContain("地址");
    expect(footer).not.toContain("内部预览");
  });

  it("keeps the preview local-only and noindex", () => {
    const layout = readCandidate("app/__redesign-preview/shell/layout.tsx");
    const page = readCandidate("app/__redesign-preview/shell/page.tsx");

    expect(layout).toContain('robots: "noindex, nofollow"');
    expect(page).toContain("notFound");
    expect(page).toContain('process.env.NODE_ENV === "production"');
    expect(page).toContain("EnheRedesignHeader");
    expect(page).toContain("EnheRedesignFooter");
    expect(page).not.toContain("secret");
    expect(page).not.toContain("git");
  });
});
