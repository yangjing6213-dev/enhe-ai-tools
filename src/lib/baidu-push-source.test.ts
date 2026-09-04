import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("Baidu push source wiring", () => {
  it("keeps Baidu token server-only and documents the environment variable", () => {
    const envExample = read(".env.example");
    const baiduPush = read("src/lib/baidu-push.ts");
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");

    expect(envExample).toContain("BAIDU_PUSH_TOKEN=");
    expect(envExample).toMatch(/^BAIDU_PUSH_TOKEN=""$/m);
    expect(envExample).toContain("BAIDU_PUSH_SITE_URL=");
    expect(baiduPush).toContain("process.env.BAIDU_PUSH_TOKEN");
    expect(baiduPush).toContain("process.env.BAIDU_PUSH_SITE_URL");
    expect(baiduPush).not.toContain("NEXT_PUBLIC_BAIDU");
    expect(compose).toContain("BAIDU_PUSH_TOKEN:");
    expect(compose).toContain("BAIDU_PUSH_SITE_URL:");
  });

  it("auto pushes published AI news, tools, tutorials, account services, and API imports", () => {
    const actions = read("src/app/admin/actions.ts");
    const importRoute = read("src/app/api/admin/ai-news/import/route.ts");

    expect(actions).toContain('import { notifyBaiduSearch } from "@/lib/baidu-push";');
    expect(actions).toContain("await notifyBaiduSearch(baiduPushUrls");
    expect(actions).toContain("await notifyBaiduSearch(indexNowUrls");
    expect(actions).toContain("await notifyBaiduSearch([result.publicUrl]");
    expect(importRoute).toContain('import { notifyBaiduSearch } from "@/lib/baidu-push";');
    expect(importRoute).toContain("await notifyBaiduSearch([result.publicUrl])");
  });

  it("provides a manual sitemap push script and npm command", () => {
    const scriptPath = "scripts/push-baidu-sitemap.ts";
    const packageJson = read("package.json");
    const script = read(scriptPath);
    const baiduPush = read("src/lib/baidu-push.ts");

    expect(existsSync(join(root, scriptPath))).toBe(true);
    expect(packageJson).toContain('"baidu:push:sitemap"');
    expect(script).toContain("getCoreBaiduSitemapUrls");
    expect(script).toContain("submitBaiduUrls");
    expect(script).toContain("recordBaiduPushResult");
    expect(script).toContain("loadLocalEnvFile");
    expect(script).toContain("appendBaiduPushFileLog");
    expect(script).not.toContain('from "@/lib/db"');
    expect(baiduPush).not.toContain('import { prisma } from "@/lib/db";');
    expect(script).toContain("--dry-run");
  });
});
