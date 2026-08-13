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

  it("provides complete typed Chinese and English footer copy without language leakage", () => {
    const footer = readCandidate("components/redesign/enhe-redesign-footer.tsx");
    const chineseCopy = footer.slice(footer.indexOf("zh: {"), footer.indexOf("en: {"));
    const englishCopy = footer.slice(footer.indexOf("en: {"));

    for (const label of [
      "帮助与服务",
      "帮助支持",
      "使用教程",
      "购买与下载",
      "产品更新",
      "合规条款",
      "用户协议",
      "隐私政策",
      "退款规则",
      "版权投诉",
      "未成年人保护",
      "公司信息",
      "品牌档案",
      "联系邮箱",
      "ICP备案 · 公安备案",
      "网站页脚",
    ]) {
      expect(chineseCopy).toContain(label);
    }

    for (const label of [
      "Help & Support",
      "Help Center",
      "Tutorials",
      "Purchase & Download",
      "Product Updates",
      "Legal",
      "Terms of Use",
      "Privacy Policy",
      "Refund Policy",
      "Copyright Complaints",
      "Protection of Minors",
      "Company",
      "Brand Profile",
      "Contact Email",
      "ICP filing · Public-security filing",
      "Site footer",
    ]) {
      expect(englishCopy).toContain(label);
    }

    for (const label of ["帮助与服务", "合规条款", "公司信息", "用户协议", "隐私政策"]) {
      expect(englishCopy).not.toContain(label);
    }
    for (const label of ["Help & Support", "Legal", "Company", "Terms of Use", "Privacy Policy"]) {
      expect(chineseCopy).not.toContain(label);
    }
  });

  it("keeps the preview header and footer on the same explicit locale specimen", () => {
    const page = readCandidate("app/redesign-preview/shell/page.tsx");
    const zhSection = page.slice(page.indexOf('<section id="zh"'), page.indexOf('<section id="en"'));
    const enSection = page.slice(page.indexOf('<section id="en"'));

    expect(zhSection).toContain('locale="zh"');
    expect(zhSection).toContain('<EnheRedesignFooter locale="zh" />');
    expect(enSection).toContain('locale="en"');
    expect(enSection).toContain('<EnheRedesignFooter locale="en" />');
    expect(page).not.toContain('<EnheRedesignFooter\n        locale="zh"');
  });

  it("keeps footer links accessible and exposes filing copy without language controls", () => {
    const footer = readCandidate("components/redesign/enhe-redesign-footer.tsx");

    expect(footer).toContain('aria-label={copy.ariaLabel}');
    expect(footer).toContain("{link.label}");
    expect(footer).toContain("{copy.filingLabel}");
    expect(footer).not.toContain("language-switch");
    expect(footer).not.toContain("AI tools");
    expect(footer).not.toContain("AI Skill");
    expect(footer).not.toContain("AI news");
    expect(footer).not.toContain("AI trends");
  });

  it("exposes only the routable preview directory and keeps the old private folder absent", () => {
    const oldLayoutPath = join(root, "app/__redesign-preview/shell/layout.tsx");
    const newLayoutPath = join(root, "app/redesign-preview/shell/layout.tsx");
    const oldPagePath = join(root, "app/__redesign-preview/shell/page.tsx");
    const newPagePath = join(root, "app/redesign-preview/shell/page.tsx");

    expect(existsSync(oldLayoutPath)).toBe(false);
    expect(existsSync(oldPagePath)).toBe(false);
    expect(existsSync(newLayoutPath)).toBe(true);
    expect(existsSync(newPagePath)).toBe(true);
  });

  it("keeps the preview local-only, guarded, and fully excluded from indexing", () => {
    const layout = readCandidate("app/redesign-preview/shell/layout.tsx");
    const page = readCandidate("app/redesign-preview/shell/page.tsx");
    const sitemap = readCandidate("app/sitemap.ts");
    const navigation = readCandidate("components/redesign/navigation.ts");

    expect(layout).toContain("index: false");
    expect(layout).toContain("follow: false");
    expect(layout).toContain("noarchive: true");
    expect(layout).toContain("noimageindex: true");
    expect(page).toContain("notFound");
    expect(page).toContain('process.env.NODE_ENV === "production"');
    expect(page).toContain("EnheRedesignHeader");
    expect(page).toContain("EnheRedesignFooter");
    expect(sitemap).not.toContain("redesign-preview");
    expect(navigation).not.toContain("redesign-preview");
    expect(page).not.toMatch(/File\.file(?:Url|Path)|https?:\/\/|orders|payment|download/i);
    expect(page).not.toContain("secret");
    expect(page).not.toContain("git");
  });
});
