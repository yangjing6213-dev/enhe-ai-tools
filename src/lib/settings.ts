import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { defaultBrandIcon } from "@/lib/seo";

export type SettingsMap = Record<string, string | undefined>;

const legacyHomeHeroTitles = ["恩禾 ENHE AI工具站", "ENHE AI Tools"];
const legacyHomeHeroSubtitles = [
  "自研电脑软件与在线网页工具会员平台",
  "自研电脑软件与在线网页工具分享共研平台",
  "驾驭 AI 工具，重塑你的工作与人生",
  "驾驭 AI 智能，重塑你的人生"
];
const legacyHomeHeroSubtitlesEn = [
  "Master AI tools and reshape your work, growth, and life",
  "Master AI intelligence and reshape your life"
];
const legacyHomeHeroIntros = [
  "我们都想变得更好，只是常常被重复工作、琐碎流程和生活难题占满时间。\n让 AI 成为你的智能助手，帮你减少消耗、提升效率，把更多精力留给成长、创造和真正想做的事。",
  "用 AI 软件应用和 AI 账号服务放大你的行动力，把重复工作交给 AI 自动化，把时间留给成长、创造和更好的自己。",
  "用本地应用和云端工具放大你的行动力，把重复工作交给 AI 自动化，把时间留给成长、创造和更好的自己。",
  "下载实用软件，使用在线工具，把重复工作交给自动化，把复杂流程变成一个按钮。"
];
const legacyHomeHeroIntrosEn = [
  "We all want to be better \u2014 but repetitive tasks, tedious processes, and daily challenges take up all our time.\nLet AI be your smart assistant, helping you reduce friction and boost efficiency, so you can put more energy into growth, creation, and the things that truly matter.",
  "Use AI software apps and AI account services to amplify your execution, hand repetitive work to AI automation, and reclaim time for growth and creation.",
  "Use desktop apps and web tools to amplify your execution, hand repetitive work to AI automation, and reclaim time for growth and creation."
];
const legacyTextLogo = "ENHE";

function isRecoverableSettingsReadError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const errorWithCode = error as Error & { code?: unknown };
  const code = typeof errorWithCode.code === "string" ? errorWithCode.code : "";
  const message = error.message;

  return code === "P1001" || /Can't reach database server/i.test(message) || /ECONNREFUSED/i.test(message);
}

const getCachedSettingsMap = unstable_cache(
  async () => {
    try {
      const settings = await prisma.siteSetting.findMany();
      return Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
    } catch (error) {
      if (isRecoverableSettingsReadError(error)) {
        return {};
      }

      throw error;
    }
  },
  ["site-settings"],
  { revalidate: 300, tags: ["site-settings"] }
);

export async function getSettingsMap() {
  return getCachedSettingsMap();
}

function cleanSettingValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function hasCjk(value: string | undefined) {
  return /[\u3400-\u9fff]/.test(value ?? "");
}

export function getEffectiveSiteName(settings: SettingsMap, fallback: string) {
  return cleanSettingValue(settings.site_name) ?? fallback;
}

export function getEffectiveLocalizedSiteName(settings: SettingsMap, locale: Locale, fallback: string) {
  const localized = cleanSettingValue(settings[`site_name_${locale}`]);

  if (locale === "en") {
    if (localized && !hasCjk(localized)) return localized;

    const globalName = cleanSettingValue(settings.site_name);
    if (globalName && !hasCjk(globalName)) return globalName;

    return fallback;
  }

  return localized ?? cleanSettingValue(settings.site_name) ?? fallback;
}

export function getEffectiveSiteLogo(settings: SettingsMap, fallback: string) {
  const value = cleanSettingValue(settings.site_logo);
  if (!value || value === legacyTextLogo || value === "/images/enhe-logo.svg" || value === "/images/enhe-logo-mark.svg") {
    return fallback || defaultBrandIcon;
  }
  if (/^https?:\/\//i.test(value) || value.startsWith("/") || /\.(svg|png|jpe?g|webp|gif)$/i.test(value)) {
    return value;
  }
  return fallback || defaultBrandIcon;
}

export function getEffectiveHomeHeroTitle(settings: SettingsMap, fallback: string) {
  const value = cleanSettingValue(settings.home_hero_title);
  if (!value || legacyHomeHeroTitles.includes(value)) return fallback;
  return value;
}

export function getEffectiveHomeHeroSubtitle(settings: SettingsMap, fallback: string) {
  const value = cleanSettingValue(settings.home_hero_subtitle);
  if (!value || legacyHomeHeroSubtitles.includes(value)) return fallback;
  return value;
}

export function getEffectiveHomeHeroIntro(settings: SettingsMap, fallback: string) {
  const value = cleanSettingValue(settings.home_hero_intro);
  if (!value || legacyHomeHeroIntros.includes(value)) return fallback;
  return value;
}

export function getEffectiveLocalizedHomeHeroSubtitle(settings: SettingsMap, locale: Locale, fallback: string) {
  const localized = cleanSettingValue(settings[`home_hero_subtitle_${locale}`]);
  if (locale === "en" && localized && legacyHomeHeroSubtitlesEn.includes(localized)) return fallback;
  if (locale === "zh" && localized && legacyHomeHeroSubtitles.includes(localized)) return fallback;
  if (localized) return localized;
  if (locale === "en") return fallback;
  return getEffectiveHomeHeroSubtitle(settings, fallback);
}

export function getEffectiveLocalizedHomeHeroIntro(settings: SettingsMap, locale: Locale, fallback: string) {
  const localized = cleanSettingValue(settings[`home_hero_intro_${locale}`]);
  if (locale === "en" && localized && legacyHomeHeroIntrosEn.includes(localized)) return fallback;
  if (locale === "zh" && localized && legacyHomeHeroIntros.includes(localized)) return fallback;
  if (localized) return localized;
  if (locale === "en") return fallback;
  return getEffectiveHomeHeroIntro(settings, fallback);
}

export function getEffectiveFooterCopyright(settings: SettingsMap, fallback: string) {
  return cleanSettingValue(settings.footer_copyright) ?? fallback;
}

export function getEffectivePaymentQrCode(value: string | undefined, fallback: string, legacyPlaceholder: string) {
  const qrCode = cleanSettingValue(value);
  if (!qrCode || qrCode === legacyPlaceholder) return fallback;
  return qrCode;
}
