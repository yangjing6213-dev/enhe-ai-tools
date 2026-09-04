import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildExternalPublishingPack,
  renderExternalPublishingPackMarkdown,
  writeExternalPublishResultInputTemplate
} from "@/lib/ebos/external-publishing";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function parseTargetDate() {
  const value = readArg("--date");
  if (!value) return formatDate(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value;
}

async function main() {
  const targetDate = parseTargetDate();
  const pack = buildExternalPublishingPack({ targetDate });
  const root = resolve(process.cwd(), "reports", "ebos", "external-publishing");
  const packDir = resolve(root, "packs");
  const inputDir = resolve(root, "inputs");
  const packJsonPath = resolve(packDir, `${targetDate}-external-publishing-pack.json`);
  const packMarkdownPath = resolve(packDir, `${targetDate}-external-publishing-pack.md`);
  const resultInputPath = resolve(inputDir, `${targetDate}-external-publish-result-input.json`);

  await mkdir(packDir, { recursive: true });
  await mkdir(inputDir, { recursive: true });
  await writeFile(packJsonPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  await writeFile(packMarkdownPath, `${renderExternalPublishingPackMarkdown(pack)}\n`, "utf8");
  const resultInput = await writeExternalPublishResultInputTemplate({
    targetDate,
    filePath: resultInputPath,
    force: hasFlag("--force")
  });

  console.log("EBOS external publishing pack generated:");
  console.log(`- JSON: ${packJsonPath}`);
  console.log(`- Markdown: ${packMarkdownPath}`);
  console.log(`- Result input: ${resultInputPath}`);
  console.log(`- Result input written: ${resultInput.written}`);
  if (resultInput.skippedReason) console.log(`- Result input skipped: ${resultInput.skippedReason}`);
  console.log(`- Channels count: ${pack.channels.length}`);
  console.log(`- Publish assets count: ${pack.publishAssets.length}`);
  console.log(`- User minimum actions count: ${pack.userMinimumActions.length}`);
  console.log("- Next commands:");
  for (const command of pack.nextCommands) console.log(`  - ${command}`);
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
