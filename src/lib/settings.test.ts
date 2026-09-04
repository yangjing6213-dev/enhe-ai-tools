import { describe, expect, it } from "vitest";
import {
  getEffectiveHomeHeroIntro,
  getEffectiveLocalizedHomeHeroIntro,
  getEffectiveLocalizedSiteName,
  getEffectiveLocalizedHomeHeroSubtitle,
  getEffectiveHomeHeroSubtitle,
  getEffectiveHomeHeroTitle,
  getEffectivePaymentQrCode,
  getEffectiveSiteLogo,
  getEffectiveSiteName
} from "@/lib/settings";

describe("public site settings", () => {
  const currentHeroSubtitle = "Symbiosis · Awakening · Creation";
  const currentHeroIntro = "与 AI 共生，在时代中觉醒，用创造定义未来。";
  const currentHeroSubtitleEn = "Symbiosis · Awakening · Creation";
  const currentHeroIntroEn = "Live in symbiosis with AI, awaken in this era, and define the future through creation.";

  it("uses explicit site settings when present", () => {
    const settings = {
      site_name: "Custom Site",
      site_logo: "/uploads/custom-logo.png",
      home_hero_title: "Custom Hero",
      home_hero_subtitle: "Custom Subtitle",
      home_hero_intro: "Custom intro"
    };

    expect(getEffectiveSiteName(settings, "Fallback")).toBe("Custom Site");
    expect(getEffectiveSiteLogo(settings, "/images/fallback.svg")).toBe("/uploads/custom-logo.png");
    expect(getEffectiveHomeHeroTitle(settings, "Fallback Hero")).toBe("Custom Hero");
    expect(getEffectiveHomeHeroSubtitle(settings, "Fallback Subtitle")).toBe("Custom Subtitle");
    expect(getEffectiveHomeHeroIntro(settings, "Fallback intro")).toBe("Custom intro");
  });

  it("ignores stale seed defaults that would revert the current branding", () => {
    const settings = {
      site_logo: "ENHE",
      home_hero_title: "ENHE AI Tools",
      home_hero_subtitle: "驾驭 AI 智能，重塑你的人生"
    };

    expect(getEffectiveSiteLogo(settings, "/images/enhe-logo.svg")).toBe("/images/enhe-logo.svg");
    expect(getEffectiveHomeHeroTitle(settings, "ENHE AI")).toBe("ENHE AI");
    expect(getEffectiveHomeHeroSubtitle(settings, currentHeroSubtitle)).toBe(currentHeroSubtitle);
  });

  it("does not leak Chinese homepage settings into the English homepage", () => {
    const settings = {
      home_hero_subtitle: "自研电脑软件与在线网页工具分享共研平台",
      home_hero_intro: "下载实用软件，使用在线工具，把重复工作交给自动化，把复杂流程变成一个按钮。"
    };

    expect(getEffectiveLocalizedHomeHeroSubtitle(settings, "en", currentHeroSubtitleEn)).toBe(currentHeroSubtitleEn);
    expect(getEffectiveLocalizedHomeHeroIntro(settings, "en", currentHeroIntroEn)).toBe(currentHeroIntroEn);
    expect(getEffectiveLocalizedHomeHeroSubtitle(settings, "zh", currentHeroSubtitle)).toBe(currentHeroSubtitle);
    expect(getEffectiveLocalizedHomeHeroIntro(settings, "zh", currentHeroIntro)).toBe(currentHeroIntro);
  });

  it("ignores stale localized homepage settings", () => {
    const settings = {
      home_hero_subtitle_zh: "驾驭 AI 工具，重塑你的工作与人生",
      home_hero_intro_zh: "我们都想变得更好，只是常常被重复工作、琐碎流程和生活难题占满时间。\n让 AI 成为你的智能助手，帮你减少消耗、提升效率，把更多精力留给成长、创造和真正想做的事。",
      home_hero_subtitle_en: "Master AI tools and reshape your work, growth, and life",
      home_hero_intro_en: "We all want to be better \u2014 but repetitive tasks, tedious processes, and daily challenges take up all our time.\nLet AI be your smart assistant, helping you reduce friction and boost efficiency, so you can put more energy into growth, creation, and the things that truly matter."
    };

    expect(getEffectiveLocalizedHomeHeroSubtitle(settings, "zh", currentHeroSubtitle)).toBe(currentHeroSubtitle);
    expect(getEffectiveLocalizedHomeHeroIntro(settings, "zh", currentHeroIntro)).toBe(currentHeroIntro);
    expect(getEffectiveLocalizedHomeHeroSubtitle(settings, "en", currentHeroSubtitleEn)).toBe(currentHeroSubtitleEn);
    expect(getEffectiveLocalizedHomeHeroIntro(settings, "en", currentHeroIntroEn)).toBe(currentHeroIntroEn);
  });

  it("uses explicit English homepage settings when configured", () => {
    const settings = {
      home_hero_subtitle: "中文副标题",
      home_hero_intro: "中文介绍",
      home_hero_subtitle_en: "Custom English subtitle",
      home_hero_intro_en: "Custom English intro"
    };

    expect(getEffectiveLocalizedHomeHeroSubtitle(settings, "en", "fallback")).toBe("Custom English subtitle");
    expect(getEffectiveLocalizedHomeHeroIntro(settings, "en", "fallback")).toBe("Custom English intro");
  });

  it("does not leak a Chinese site name into the English public chrome", () => {
    const settings = {
      site_name: "恩禾 ENHE AI"
    };

    expect(getEffectiveLocalizedSiteName(settings, "en", "ENHE AI")).toBe("ENHE AI");
    expect(getEffectiveLocalizedSiteName(settings, "zh", "恩禾 ENHE AI")).toBe("恩禾 ENHE AI");
  });

  it("uses an explicit English site name when configured", () => {
    const settings = {
      site_name: "恩禾 ENHE AI",
      site_name_en: "ENHE AI"
    };

    expect(getEffectiveLocalizedSiteName(settings, "en", "fallback")).toBe("ENHE AI");
  });

  it("resolves payment QR code settings with default fallbacks", () => {
    expect(getEffectivePaymentQrCode(undefined, "/images/payment/alipay-qr.jpg", "/images/alipay-qr.svg")).toBe(
      "/images/payment/alipay-qr.jpg"
    );
    expect(getEffectivePaymentQrCode("/images/alipay-qr.svg", "/images/payment/alipay-qr.jpg", "/images/alipay-qr.svg")).toBe(
      "/images/payment/alipay-qr.jpg"
    );
    expect(getEffectivePaymentQrCode("/uploads/alipay-new.png", "/images/payment/alipay-qr.jpg", "/images/alipay-qr.svg")).toBe(
      "/uploads/alipay-new.png"
    );
  });
});
