import { describe, expect, it } from "vitest";
import {
  getRequestCountryCode,
  getRequestLocalePreference,
  getRequestedLocaleSwitch,
  inferLocaleFromRequest,
  isSearchOrAiCrawler,
  normalizePathForRequestedLocale,
} from "@/lib/locale-routing";

function headers(values: Record<string, string>) {
  return new Headers(values);
}

describe("locale routing", () => {
  it("prefers country headers for root-page locale inference", () => {
    expect(inferLocaleFromRequest(headers({ "cf-ipcountry": "CN", "accept-language": "en-US,en;q=0.9" }))).toBe("zh");
    expect(inferLocaleFromRequest(headers({ "x-country-code": "US", "accept-language": "zh-CN,zh;q=0.9" }))).toBe("en");
    expect(getRequestCountryCode(headers({ "cloudfront-viewer-country": "DE" }))).toBe("DE");
  });

  it("falls back to Accept-Language when the server has no country header", () => {
    expect(inferLocaleFromRequest(headers({ "accept-language": "zh-CN,zh;q=0.9,en;q=0.8" }))).toBe("zh");
    expect(inferLocaleFromRequest(headers({ "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" }))).toBe("en");
  });

  it("uses country first, then browser language, while respecting the saved manual language", () => {
    expect(getRequestLocalePreference(undefined, headers({ "cf-ipcountry": "US", "accept-language": "zh-CN" }))).toBe("en");
    expect(getRequestLocalePreference(undefined, headers({ "cf-ipcountry": "CN", "accept-language": "en-US" }))).toBe("zh");
    expect(getRequestLocalePreference("zh", headers({ "cf-ipcountry": "US" }))).toBe("zh");
    expect(getRequestLocalePreference("en", headers({ "cf-ipcountry": "CN" }))).toBe("en");
  });

  it("does not auto-redirect search and AI crawlers", () => {
    expect(isSearchOrAiCrawler("GPTBot/1.0")).toBe(true);
    expect(isSearchOrAiCrawler("Googlebot/2.1")).toBe(true);
    expect(getRequestLocalePreference(undefined, headers({ "cf-ipcountry": "US", "user-agent": "GPTBot/1.0" }))).toBeNull();
  });

  it("honors explicit user language switching before root geo redirects", () => {
    expect(getRequestedLocaleSwitch(new URLSearchParams("locale=zh"))).toBe(
      "zh",
    );
    expect(getRequestedLocaleSwitch(new URLSearchParams("locale=en"))).toBe(
      "en",
    );
    expect(getRequestedLocaleSwitch(new URLSearchParams("locale=fr"))).toBe(
      null,
    );
    expect(normalizePathForRequestedLocale("/en", "zh")).toBe("/");
    expect(normalizePathForRequestedLocale("/en/software/demo", "zh")).toBe(
      "/software/demo",
    );
    expect(normalizePathForRequestedLocale("/", "en")).toBe("/en");
    expect(normalizePathForRequestedLocale("/software/demo", "en")).toBe(
      "/en/software/demo",
    );
    expect(normalizePathForRequestedLocale("/about", "en")).toBe("/en/about");
    expect(normalizePathForRequestedLocale("/redesign-preview/home", "en")).toBe(
      "/redesign-preview/home",
    );
  });

  it("keeps admin locale switches on the same path for any visitor region", () => {
    expect(normalizePathForRequestedLocale("/admin", "zh")).toBe("/admin");
    expect(normalizePathForRequestedLocale("/admin", "en")).toBe("/admin");
    expect(normalizePathForRequestedLocale("/admin/ai-news", "zh")).toBe(
      "/admin/ai-news",
    );
  });
});
