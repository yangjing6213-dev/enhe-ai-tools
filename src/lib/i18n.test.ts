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
  it("uses the new Chinese AI software and account-service naming", () => {
    expect(dictionaries.zh.nav.software).toBe("AI软件应用");
    expect(dictionaries.zh.nav.onlineTools).toBe("AI账号服务");
    expect(dictionaries.zh.home.softwareButton).toBe("AI软件应用");
    expect(dictionaries.zh.home.onlineButton).toBe("AI账号服务");
    expect(dictionaries.zh.home.featuredSoftwareEyebrow).toBe("AI Software Apps");
    expect(dictionaries.zh.home.featuredSoftwareTitle).toBe("精选AI软件应用");
    expect(dictionaries.zh.home.onlineToolsEyebrow).toBe("AI Account Services");
    expect(dictionaries.zh.home.onlineToolsTitle).toBe("精选AI账号服务");
    expect(dictionaries.zh.listing.softwareTitle).toBe("AI软件应用");
    expect(dictionaries.zh.listing.onlineTitle).toBe("AI账号服务");
    expect(dictionaries.zh.toolDetail.software).toBe("AI软件应用");
    expect(dictionaries.zh.toolDetail.online).toBe("AI账号服务");
  });

  it("uses matching English naming for the same surfaces", () => {
    expect(dictionaries.en.nav.software).toBe("AI Software Apps");
    expect(dictionaries.en.nav.onlineTools).toBe("AI Account Services");
    expect(dictionaries.en.home.softwareButton).toBe("AI Software Apps");
    expect(dictionaries.en.home.onlineButton).toBe("AI Account Services");
    expect(dictionaries.en.home.featuredSoftwareEyebrow).toBe("AI Software Apps");
    expect(dictionaries.en.home.onlineToolsEyebrow).toBe("AI Account Services");
  });
});
