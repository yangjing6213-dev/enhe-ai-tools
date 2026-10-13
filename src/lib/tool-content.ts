export type ToolContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[]; start?: number };

const unorderedListPattern = /^\s*(?:[-*]|\u2022)\s+(.+)$/;
const orderedListPattern = /^\s*(?:(\d+)[.)\u3001]|[\uFF08(](\d+)[\uFF09)])\s*(.+)$/;
const markdownHeadingPattern = /^\s*#{1,4}\s+(.+)$/;
const colonListLinePattern = /^\s*([^:：\n]{2,24})[:：]\s*(\S.+)$/;
const absoluteHttpUrlPresencePattern = /https?:\/\//i;
const knownStandaloneHeadingLabels = new Set([
  "主要功能",
  "核心功能",
  "功能亮点",
  "使用场景",
  "适用场景",
  "关键界面",
  "转化 CTA",
  "转化CTA",
  "产品亮点",
  "产品介绍",
  "应用场景",
  "Key features",
  "Features",
  "Use cases",
  "Usage scenarios",
  "Key screens",
  "Product highlights",
  "Product introduction",
  "CTA"
].map((item) => item.toLowerCase()));

export function tagSlug(name: string) {
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const encoded = encodeURIComponent(name.trim()).replace(/%/g, "").toLowerCase();
  if (/\p{Extended_Pictographic}/u.test(name)) return [ascii, encoded].filter(Boolean).join("-");
  return ascii || encoded;
}

export function parseTagNames(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[\n,\uFF0C\u3001]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeLineBreaks(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
}

function normalizeInlineSpace(value: string) {
  return value.replace(/[ \t]+/g, " ").trim();
}

export function normalizeToolSummaryForStorage(value: string) {
  return value.trim() ? value.replace(/\r\n?/g, "\n") : "";
}

export function normalizeToolContentForStorage(value: string) {
  return value.trim() ? value.replace(/\r\n?/g, "\n") : "";
}

function normalizeHeadingText(value: string) {
  return normalizeInlineSpace(value).replace(/[\uFF1A:]\s*$/, "");
}

function isColonListLine(line: string) {
  if (absoluteHttpUrlPresencePattern.test(line)) return false;

  const match = line.match(colonListLinePattern);
  if (!match) return false;
  return normalizeInlineSpace(match[1] ?? "").length <= 24 && Boolean(normalizeInlineSpace(match[2] ?? ""));
}

function isStandaloneHeadingLine(line: string, nextLine?: string) {
  const text = normalizeInlineSpace(line);
  if (!text || text.length > 48) return false;
  if (/[\u3002\uFF01\uFF1F\uFF1B.!?;,\uFF0C\u3001\uFF1A:]/.test(text)) return false;

  return knownStandaloneHeadingLabels.has(text.toLowerCase()) || Boolean(nextLine && isColonListLine(nextLine));
}

function isHeadingLine(line: string, nextLine?: string) {
  const text = normalizeInlineSpace(line);
  if (!text) return false;
  if (markdownHeadingPattern.test(text)) return true;
  if (isStandaloneHeadingLine(text, nextLine)) return true;
  if (!/[\uFF1A:]$/.test(text)) return false;
  return normalizeHeadingText(text).length <= 48;
}

function parseHeadingLine(line: string) {
  const markdown = line.match(markdownHeadingPattern);
  return normalizeHeadingText(markdown?.[1] ?? line);
}

function parseListLine(line: string, allowColonListLine = false) {
  const unordered = line.match(unorderedListPattern);
  if (unordered) return { type: "unordered-list" as const, text: normalizeInlineSpace(unordered[1]) };

  const ordered = line.match(orderedListPattern);
  if (ordered) {
    const marker = Number.parseInt(ordered[1] ?? ordered[2] ?? "1", 10);
    const start = Number.isFinite(marker) && marker > 0 ? marker : 1;
    return { type: "ordered-list" as const, text: normalizeInlineSpace(ordered[3] ?? ""), start };
  }

  if (allowColonListLine && isColonListLine(line)) {
    return { type: "unordered-list" as const, text: normalizeInlineSpace(line) };
  }

  return null;
}

function pushParagraphBlock(blocks: ToolContentBlock[], lines: string[]) {
  const text = lines.map(normalizeInlineSpace).filter(Boolean).join(" ");
  if (text) blocks.push({ type: "paragraph", text });
  lines.length = 0;
}

function pushListBlock(
  blocks: ToolContentBlock[],
  listType: "unordered-list" | "ordered-list" | null,
  items: string[],
  orderedListStart?: number
) {
  if (listType && items.length) {
    if (listType === "ordered-list" && orderedListStart && orderedListStart !== 1) {
      blocks.push({ type: listType, start: orderedListStart, items: [...items] });
    } else {
      blocks.push({ type: listType, items: [...items] });
    }
  }
  items.length = 0;
}

export function buildToolContentBlocks(value: string): ToolContentBlock[] {
  const content = normalizeToolContentForStorage(value);
  if (!content) return [];

  const blocks: ToolContentBlock[] = [];
  const paragraphLines: string[] = [];
  const listItems: string[] = [];
  const lines = content.split("\n").map(normalizeInlineSpace);
  let listType: "unordered-list" | "ordered-list" | null = null;
  let orderedListStart: number | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines.slice(index + 1).find(Boolean);
    if (!line) {
      pushParagraphBlock(blocks, paragraphLines);
      pushListBlock(blocks, listType, listItems, orderedListStart);
      listType = null;
      orderedListStart = undefined;
      continue;
    }

    if (isHeadingLine(line, nextLine)) {
      pushParagraphBlock(blocks, paragraphLines);
      pushListBlock(blocks, listType, listItems, orderedListStart);
      listType = null;
      orderedListStart = undefined;
      blocks.push({ type: "heading", text: parseHeadingLine(line) });
      continue;
    }

    const previousBlock = blocks.at(-1);
    const allowColonListLine = listType === "unordered-list" || previousBlock?.type === "heading";
    const listLine = parseListLine(line, allowColonListLine);
    if (listLine) {
      pushParagraphBlock(blocks, paragraphLines);
      if (listType && listType !== listLine.type) {
        pushListBlock(blocks, listType, listItems, orderedListStart);
        listType = null;
        orderedListStart = undefined;
      }
      if (!listType && listLine.type === "ordered-list") {
        orderedListStart = listLine.start;
      }
      listType = listLine.type;
      listItems.push(listLine.text);
      continue;
    }

    pushListBlock(blocks, listType, listItems, orderedListStart);
    listType = null;
    orderedListStart = undefined;
    paragraphLines.push(line);
  }

  pushParagraphBlock(blocks, paragraphLines);
  pushListBlock(blocks, listType, listItems, orderedListStart);

  return blocks;
}
