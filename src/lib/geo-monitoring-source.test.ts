import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function exists(path: string) {
  return existsSync(join(root, path));
}

describe("GEO monitoring source wiring", () => {
  it("adds a GEO monitoring center to the admin sidebar", () => {
    const layout = read("src/app/admin/layout.tsx");
    const dictionary = read("src/lib/admin-i18n.ts");
    const page = read("src/app/admin/geo-monitoring/page.tsx");
    const actions = read("src/app/admin/geo-monitoring/actions.ts");

    expect(layout).toContain('["geoMonitoring", "/admin/geo-monitoring"]');
    expect(dictionary).toContain("geoMonitoring");
    expect(dictionary).toContain('geoMonitoring: "GEO 人工巡检台账"');
    expect(dictionary).toContain('geoMonitoring: "GEO manual evidence log"');
    expect(dictionary).not.toContain('geoMonitoring: "GEO 监控中心"');
    expect(dictionary).not.toContain('geoMonitoring: "GEO monitoring"');
    expect(page).toContain("buildGeoMonitoringReport");
    expect(page).toContain("ensureGeoMonitoringDefaults");
    expect(page).toContain("recordGeoVisibilityResultAction");
    expect(actions).toContain("export async function ensureGeoMonitoringDefaults");
    expect(actions).toContain("export async function recordGeoVisibilityResultAction");
    expect(page).toContain("GEO 人工巡检证据台账");
    expect(page).toContain("百度");
    expect(page).toContain("豆包");
    expect(page).toContain("记录巡检结果");
    expect(page).toContain('name="collectionStatus"');
    expect(page).toContain("平台不可用");
    expect(actions).toContain("collectionStatusSchema");
    expect(actions).toContain("isConfiguredGeoQuery");
    expect(actions).toContain("isConfiguredGeoProvider");
    expect(actions).not.toContain("const providerKeySchema = z.string().min(1)");
    expect(actions).not.toContain("const queryTextSchema = z.string().min(1)");
    expect(actions).toContain("`geo:${collectionStatus}`");
    expect(actions).toContain("hasVerifiableEnheCitationEvidence");
    expect(actions).not.toContain('url.includes("enhe-tech.com.cn")');
    expect(page).toContain("prisma.geoVisibilityResult");
    expect(page).toContain(".groupBy({");
    expect(page).toContain('by: ["queryText", "providerKey"]');
    expect(page).toContain("where: { OR: latestFilters }");
    expect(page).not.toContain("geoVisibilityResult.findFirst");
    expect(page).not.toContain("take: 300");
    expect(page).not.toContain('name="isDomainCited"');
    expect(page).toContain("GEO 人工巡检证据台账");
    expect(page).toContain("不代表自动监控或真实自动采集");
    expect(page).toContain("有效样本数");
    expect(page).toContain("目标覆盖");
    expect(page).toContain("日期范围");
    expect(page).toContain("最近巡检时间");
    expect(page).toContain("人工证据状态");
    expect(page).toContain("数据不足");
    expect(page).toContain("数据库读取失败，当前按空态显示");
    expect(page).toContain("不含完整审核人、证据哈希、自动采集或数据库迁移");
    expect(page).toContain('orderBy: [{ checkedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]');
  });

  it("adds database tables for GEO queries, providers, results, runs, and recommendations", () => {
    const schema = read("prisma/schema.prisma");

    for (const name of [
      "model GeoQuery",
      "model GeoProvider",
      "model GeoVisibilityRun",
      "model GeoVisibilityResult",
      "model GeoRecommendation"
    ]) {
      expect(schema).toContain(name);
    }

    expect(schema).toContain("enum GeoPlatformRegion");
    expect(schema).toContain("enum GeoProviderMode");
    expect(schema).toContain("@@map(\"geo_visibility_results\")");
  });

  it("expands OKF with independent concept pages for public content pillars", () => {
    for (const path of [
      "public/okf/ai-news/index.md",
      "public/okf/software/index.md",
      "public/okf/account-services/index.md",
      "public/okf/skill-learning/index.md"
    ]) {
      expect(exists(path)).toBe(true);
    }

    const okfIndex = read("public/okf/index.md");
    expect(okfIndex).toContain("./ai-news/index.md");
    expect(okfIndex).toContain("./software/index.md");
    expect(okfIndex).toContain("./account-services/index.md");
    expect(okfIndex).toContain("./skill-learning/index.md");
  });

  it("keeps the new OKF concept pages publicly cached without adding them to the Google sitemap", () => {
    const sitemap = read("src/app/sitemap.ts");
    const nextConfig = read("next.config.ts");

    for (const path of [
      "/okf/ai-news/index.md",
      "/okf/software/index.md",
      "/okf/account-services/index.md",
      "/okf/skill-learning/index.md"
    ]) {
      expect(sitemap).not.toContain(`path: "${path}"`);
      expect(nextConfig).toContain(`source: "${path}"`);
    }
  });
});
