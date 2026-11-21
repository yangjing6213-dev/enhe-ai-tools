import { describe, expect, it } from "vitest";
import { dictionaries, normalizeLocale } from "@/lib/i18n";

describe("normalizeLocale", () => {
  it("keeps supported locales", () => {
    expect(normalizeLocale("zh")).toBe("zh");
    expect(normalizeLocale("en")).toBe("en");
  });

  it("falls back to Chinese for unknown values", () => {
    expect(normalizeLocale("ja")).toBe("zh");
    expect(normalizeLocale(undefined)).toBe("zh");
  });
});

describe("homepage and navigation copy", () => {
  it("uses the new Chinese themed product-entry naming", () => {
    expect(dictionaries.zh.nav.software).toBe("AI工具");
    expect(dictionaries.zh.nav.onlineTools).toBe("AI账号服务");
    expect(dictionaries.zh.home.softwareButton).toBe("热门AI工具");
    expect(dictionaries.zh.home.onlineButton).toBe("生成图片/视频/音频");
    expect(dictionaries.zh.home.skillLearningButton).toBe("改变你未来的AI");
    expect(dictionaries.zh.home.categoryMenu.items.productivity.label).toBe("工作效率");
    expect(dictionaries.zh.home.categoryMenu.items.contentCreation.label).toBe("内容创作");
    expect(dictionaries.zh.home.categoryMenu.items.aiLearning.label).toBe("AI 教程");
    expect(dictionaries.zh.home.categoryMenu.items.aiNews.label).toBe("AI 资讯");
    expect(dictionaries.zh.home.featuredSoftwareEyebrow).toBe("AI Software Apps");
    expect(dictionaries.zh.home.featuredSoftwareTitle).toBe("精选AI软件应用");
    expect(dictionaries.zh.home.onlineToolsEyebrow).toBe("AI Account Services");
    expect(dictionaries.zh.home.onlineToolsTitle).toBe("精选AI账号服务");
    expect(dictionaries.zh.listing.softwareTitle).toBe("最热门AI工具");
    expect(dictionaries.zh.listing.onlineTitle).toBe("AI账号服务");
    expect(dictionaries.zh.listing.skillLearningTitle).toBe("AI教程与课程");
    expect(dictionaries.zh.toolDetail.software).toBe("AI软件应用");
    expect(dictionaries.zh.toolDetail.online).toBe("AI账号服务");
  });

  it("uses matching English naming for the same surfaces", () => {
    expect(dictionaries.en.nav.software).toBe("AI Tools");
    expect(dictionaries.en.nav.onlineTools).toBe("AI Account Services");
    expect(dictionaries.en.home.softwareButton).toBe("Popular AI Tools");
    expect(dictionaries.en.home.onlineButton).toBe("Generate Images/Video/Audio");
    expect(dictionaries.en.home.skillLearningButton).toBe("Change Your AI Future");
    expect(dictionaries.en.home.categoryMenu.items.productivity.label).toBe("Productivity");
    expect(dictionaries.en.home.categoryMenu.items.contentCreation.label).toBe("Content Creation");
    expect(dictionaries.en.home.categoryMenu.items.aiLearning.label).toBe("AI Tutorials");
    expect(dictionaries.en.home.categoryMenu.items.aiNews.label).toBe("AI News");
    expect(dictionaries.en.home.featuredSoftwareEyebrow).toBe("AI Software Apps");
    expect(dictionaries.en.home.onlineToolsEyebrow).toBe("AI Account Services");
    expect(dictionaries.en.listing.onlineTitle).toBe("AI Account Services");
    expect(dictionaries.en.listing.skillLearningTitle).toBe("AI Tutorials & Courses");
  });
});
