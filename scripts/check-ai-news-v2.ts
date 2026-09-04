import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, resolve } from "node:path";
import { credentialFreeEnvironment } from "./ai-news-batch-client";

// This local workflow intentionally has no publishing phase or source-fetching credentials.
const env = credentialFreeEnvironment(process.env);
for (const name of ["ENHE_AI_NEWS_VALIDATOR_PATH", "ENHE_AI_NEWS_VALIDATOR_SHA256", "ENHE_AI_NEWS_PYTHON"]) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing local verifier configuration: ${name}`);
  env[name] = value;
}
if (!isAbsolute(env.ENHE_AI_NEWS_VALIDATOR_PATH!) || !isAbsolute(env.ENHE_AI_NEWS_PYTHON!)) throw new Error("Validator and Python paths must be absolute.");
if (createHash("sha256").update(readFileSync(env.ENHE_AI_NEWS_VALIDATOR_PATH!)).digest("hex") !== env.ENHE_AI_NEWS_VALIDATOR_SHA256) throw new Error("Approved validator hash mismatch.");
env.PATH = dirname(process.execPath);
const tests = ["src/lib/ai-news-import.test.ts", "src/lib/ai-news-html-import.test.ts", "src/lib/ai-news-html-import-batch.test.ts", "src/lib/ai-news-batch.test.ts", "src/lib/ai-news-batch-persistence.test.ts",
  "src/app/api/admin/ai-news/import/route.test.ts", "src/app/api/admin/ai-news/import/batch-route.test.ts", "scripts/publish-ai-news-html.test.ts",
  "scripts/ai-news-batch-client.test.ts", "scripts/ai-news-batch-integration.test.ts", "src/lib/public-slugs.test.ts"];
const lintFiles = ["scripts/check-ai-news-v2.ts", "scripts/ai-news-batch-client.ts", "scripts/ai-news-batch-client.test.ts", "scripts/ai-news-batch-integration.test.ts", "scripts/fixtures/ai-news-v2.ts", "scripts/publish-ai-news-html.ts",
  "src/lib/ai-news-import.ts", "src/lib/ai-news-import-schema.ts", "src/lib/ai-news-html-import.ts", "src/lib/ai-news-html-import-batch.test.ts",
  "src/lib/ai-news-batch-contract.ts", "src/lib/ai-news-batch.ts", "src/lib/ai-news-batch.test.ts", "src/lib/ai-news-batch-persistence.test.ts", "src/app/api/admin/ai-news/import/route.ts", "src/app/api/admin/ai-news/import/batch-route.test.ts"];
for (const args of [[resolve("node_modules/vitest/vitest.mjs"), "run", ...tests], [resolve("node_modules/eslint/bin/eslint.js"), ...lintFiles]]) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env, stdio: "inherit", windowsHide: true, timeout: 120000 });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
console.log("PASS: focused V2 tests, unchanged external HTML validator, and changed-file lint. Production database and whole-site build are separate gates.");
