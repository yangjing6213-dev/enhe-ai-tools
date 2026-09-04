import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  buildBaiduPushUrls,
  extractBaiduUrlsFromSitemapXml,
  getCoreBaiduSitemapUrls,
  recordBaiduPushResult,
  submitBaiduUrls
} from "@/lib/baidu-push";

const defaultSitemapUrl = "https://www.enhe-tech.com.cn/sitemap.xml";
const defaultLogPath = join(process.cwd(), "logs", "baidu-push.jsonl");
let didUseDatabase = false;

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

async function loadLocalEnvFile(path = join(process.cwd(), ".env")) {
  try {
    const content = await readFile(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed || process.env[parsed.key]) continue;
      process.env[parsed.key] = parsed.value;
    }
  } catch {
    // Manual pushes can still use already-exported environment variables.
  }
}

async function appendBaiduPushFileLog(entry: Record<string, unknown>, path = defaultLogPath) {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify({ checkedAt: new Date().toISOString(), ...entry })}\n`, "utf8");
}

async function main() {
  await loadLocalEnvFile();
  const dryRun = process.argv.includes("--dry-run");
  const includeEnglish = process.argv.includes("--include-en");
  const fromDb = process.argv.includes("--from-db");
  const limitValue = getArgValue("--limit");
  const sitemapUrl = getArgValue("--sitemap") ?? defaultSitemapUrl;
  const limit = limitValue ? Number.parseInt(limitValue, 10) : undefined;
  const limitOptions = Number.isFinite(limit) && limit && limit > 0 ? { limit } : {};
  didUseDatabase = fromDb;
  const urls = fromDb
    ? await getCoreBaiduSitemapUrls({
        includeEnglish,
        ...limitOptions
      })
    : await getCoreBaiduSitemapUrlsFromRemoteSitemap(sitemapUrl, { includeEnglish, ...limitOptions });

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, count: urls.length, urls }, null, 2));
    return;
  }

  const result = await submitBaiduUrls(urls);
  await appendBaiduPushFileLog({
    source: "manual-sitemap-script",
    mode: fromDb ? "database" : "remote-sitemap",
    sitemapUrl: fromDb ? null : sitemapUrl,
    includeEnglish,
    limit: limit ?? null,
    result
  });
  if (fromDb) {
    await recordBaiduPushResult(result, {
      source: "manual-sitemap-script",
      mode: "database",
      sitemapUrl: null,
      includeEnglish,
      limit: limit ?? null
    });
  }
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = result.reason === "no-urls" ? 0 : 1;
  }
}

async function getCoreBaiduSitemapUrlsFromRemoteSitemap(
  sitemapUrl: string,
  options: { includeEnglish?: boolean; limit?: number } = {}
) {
  const response = await fetch(sitemapUrl, {
    headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.1" }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
  }

  const urls = extractBaiduUrlsFromSitemapXml(await response.text(), { includeEnglish: options.includeEnglish });
  return buildBaiduPushUrls(typeof options.limit === "number" && options.limit > 0 ? urls.slice(0, options.limit) : urls);
}

main()
  .catch((error) => {
    console.error("[baidu-push] sitemap push failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (didUseDatabase) {
      const { prisma } = await import("@/lib/db");
      await prisma.$disconnect();
    }
  });
