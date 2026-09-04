import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type PublishMode = "draft" | "published";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function assertPublishMode(value: string | null): PublishMode {
  if (value === null) return "draft";
  if (value === "draft") return "draft";
  if (value === "published") return "published";
  throw new Error(`Invalid --mode ${value}. Expected draft or published.`);
}

function assertSafeImportUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("AI_NEWS_IMPORT_URL must be a valid URL.");
  }

  if (url.protocol === "https:") return;
  if (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]")
  ) {
    return;
  }

  throw new Error("Refusing to send AI_NEWS_IMPORT_TOKEN to plaintext remote URL.");
}

function parseJsonObject(text: string) {
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function stripUtf8Bom(text: string) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseTags(value: string | null) {
  if (!value) return undefined;
  const tags = value
    .split(/[\n,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length ? tags : undefined;
}

function formatImportFailure(response: Response, text: string) {
  const body = parseJsonObject(text);
  if (body) {
    const error = typeof body.error === "string" ? body.error : "IMPORT_FAILED";
    const message = typeof body.message === "string" ? body.message : response.statusText;
    if (error === "DUPLICATE_COVER_IMAGE") {
      return `RETRYABLE_COVER_IMAGE_DUPLICATE: ${message}`;
    }
    return `Import failed with HTTP ${response.status}: ${error}: ${message}`;
  }

  const excerpt = text.trim().slice(0, 500) || response.statusText;
  return `Import failed with HTTP ${response.status}: ${excerpt}`;
}

async function main() {
  if (process.argv.includes("--manifest")) {
    const { runBatchClient } = await import("./ai-news-batch-client");
    console.log(JSON.stringify(await runBatchClient(process.argv.slice(2)), null, 2));
    return;
  }
  const file = readArg("--file");
  if (!file) {
    throw new Error("Missing --file path to AI news HTML file.");
  }

  const importUrl = process.env.AI_NEWS_IMPORT_URL;
  const importToken = process.env.AI_NEWS_IMPORT_TOKEN;
  if (!importUrl) throw new Error("Missing AI_NEWS_IMPORT_URL.");
  if (!importToken) throw new Error("Missing AI_NEWS_IMPORT_TOKEN.");
  assertSafeImportUrl(importUrl);

  const batch = readArg("--batch");
  const categoryName = readArg("--category");
  const categorySlug = readArg("--category-slug");
  const tags = parseTags(readArg("--tags"));
  const payload = {
    format: "html",
    html: stripUtf8Bom(await readFile(resolve(file), "utf8")).trim(),
    publishMode: assertPublishMode(readArg("--mode")),
    ...(batch ? { importBatchId: batch } : {}),
    ...(categoryName ? { categoryName } : {}),
    ...(categorySlug ? { categorySlug } : {}),
    ...(tags ? { tags } : {})
  };

  const response = await fetch(importUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${importToken}`
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  const body = parseJsonObject(responseText) as {
    ok?: boolean;
    error?: string;
    message?: string;
    articleId?: string;
    adminUrl?: string;
    publicUrl?: string | null;
  } | null;

  if (!response.ok || !body?.ok) {
    throw new Error(formatImportFailure(response, responseText));
  }

  console.log(`Imported AI news article: ${body.articleId}`);
  console.log(`Admin URL: ${body.adminUrl}`);
  if (body.publicUrl) {
    console.log(`Public URL: ${body.publicUrl}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
