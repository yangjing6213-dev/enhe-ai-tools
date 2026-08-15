import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { companyProfile } from "@/lib/company-profile";
import { getDictionary } from "@/lib/dictionaries";
import { PRODUCTION_FILING } from "@/lib/production-filing";

describe("english shared UI source", () => {
  it("keeps the English language switcher free of Chinese labels", () => {
    const switcher = readFileSync(new URL("../components/language-switcher.tsx", import.meta.url), "utf8");

    expect(switcher).toContain('locale === "en" && item === "zh" ? "ZH" : labels[item]');
    expect(getDictionary("en").language.zh).not.toBe("中文");
  });

  it("uses localized site-name helpers across shared public chrome", () => {
    const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");

    expect(header).toContain("getEffectiveLocalizedSiteName");
    expect(footer).toContain("getEffectiveLocalizedSiteName");
  });

  it("renders English filing labels from the shared tracked source in the English footer", () => {
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");

    expect(footer).toContain("PRODUCTION_FILING[locale]");
    expect(PRODUCTION_FILING.en.publicSecurity.label).toBe(
      "Fujian Public Security Record No. 35030302900035",
    );
    expect(PRODUCTION_FILING.en.icp.label).toBe("ICP Filing: Min ICP No. 2025092404-2");
    expect(footer).toContain("companyProfile.name[locale]");
    expect(companyProfile.name.en).toBe(
      "Shenzhen Longgang District Enhe Network Technology Studio",
    );
  });
});
