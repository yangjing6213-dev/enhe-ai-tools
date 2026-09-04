import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  DEPLOYMENT_APPROVAL_EXPECTED_PHRASE,
  buildApprovalResponseAudit,
  renderApprovalResponseAuditMarkdown
} from "@/lib/ebos";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function parseTargetDateKey() {
  const value = readArg("--date");
  if (!value) return toDateKey(new Date());
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value.slice(0, 10);
}

async function main() {
  const targetDate = parseTargetDateKey();
  const response = readArg("--response") ?? "";
  const audit = buildApprovalResponseAudit(response, DEPLOYMENT_APPROVAL_EXPECTED_PHRASE, { targetDate });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "execution", "approvals", "responses");
  const jsonPath = resolve(outputDir, `${targetDate}-approval-response-audit.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-approval-response-audit.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderApprovalResponseAuditMarkdown(audit)}\n`, "utf8");

  console.log("EBOS deployment approval response parsed:");
  console.log(`- expectedPhrase: ${audit.expectedPhrase}`);
  console.log(`- receivedResponse: ${audit.receivedResponse}`);
  console.log(`- approvalDecision: ${audit.approvalDecision}`);
  console.log(`- exactMatch: ${audit.exactMatch}`);
  console.log(`- warnings: ${audit.warnings.length}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
