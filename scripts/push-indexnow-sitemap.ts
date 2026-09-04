import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { submitIndexNowUrls } from "@/lib/indexnow";

const defaultSitemapUrl = "https://www.enhe-tech.com.cn/sitemap.xml";

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
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
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

function extractUrlsFromSitemapXml(xml: string) {
  const urls: string[] = [];
  const pattern = /<loc>([^<]+)<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml))) {
    urls.push(match[1].trim());
  }
  return urls;
}

async function main() {
  await loadLocalEnvFile();
  const dryRun = process.argv.includes("--dry-run");
  const limitValue = getArgValue("--limit");
  const sitemapUrl = getArgValue("--sitemap") ?? defaultSitemapUrl;
  const limit = limitValue ? Number.parseInt(limitValue, 10) : undefined;

  const response = await fetch(sitemapUrl, {
    headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.1" },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch sitemap: ${response.status} ${response.statusText}`,
    );
  }

  const urls = extractUrlsFromSitemapXml(await response.text());
  const selectedUrls =
    Number.isFinite(limit) && limit && limit > 0 ? urls.slice(0, limit) : urls;

  if (dryRun) {
    console.log(
      JSON.stringify(
        { dryRun: true, count: selectedUrls.length, urls: selectedUrls },
        null,
        2,
      ),
    );
    return;
  }

  const result = await submitIndexNowUrls(selectedUrls);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = result.reason === "no-urls" ? 0 : 1;
  }
}

main().catch((error) => {
  console.error("[indexnow] sitemap push failed", error);
  process.exitCode = 1;
});
