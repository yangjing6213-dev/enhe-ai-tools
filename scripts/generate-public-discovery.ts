import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { companyProfile } from "../src/lib/company-profile";
import {
  renderLlmsImportantPages,
  renderLlmsMachineReadableResources,
  renderOkfCanonicalSections,
  renderOkfFiles,
} from "../src/lib/public-discovery-manifest";

function replaceGeneratedBlock(source: string, marker: string, content: string) {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const start = `<!-- ${marker}:START -->`;
  const end = `<!-- ${marker}:END -->`;
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);

  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`Missing or invalid generated block: ${marker}`);
  }

  const normalizedContent = content.replace(/\r?\n/g, newline);
  return `${source.slice(0, startIndex + start.length)}${newline}${normalizedContent}${newline}${source.slice(endIndex)}`;
}

function updateFile(path: string, blocks: Array<[string, string]>) {
  const absolutePath = join(process.cwd(), path);
  const source = readFileSync(absolutePath, "utf8");
  const next = blocks.reduce(
    (current, [marker, content]) => replaceGeneratedBlock(current, marker, content),
    source,
  );

  if (next !== source) writeFileSync(absolutePath, next, "utf8");
}

updateFile("public/llms.txt", [
  ["PUBLIC_CONTACT", `- Email: ${companyProfile.email.value}`],
  ["PUBLIC_DISCOVERY_PAGES", renderLlmsImportantPages()],
  ["PUBLIC_DISCOVERY_RESOURCES", renderLlmsMachineReadableResources()],
]);

updateFile("public/okf/enhe-ai-overview.md", [
  ["PUBLIC_CONTACT", `- Email: ${companyProfile.email.value}`],
]);

updateFile("public/okf/index.md", [
  ["PUBLIC_DISCOVERY_OKF_FILES", renderOkfFiles()],
  ["PUBLIC_DISCOVERY_OKF_SECTIONS", renderOkfCanonicalSections()],
]);
