export type ToolContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[]; start?: number };

const unorderedListPattern = /^\s*(?:[-*]|\u2022)\s+(.+)$/;
const orderedListPattern = /^\s*(?:(\d+)[.)\u3001]|[\uFF08(](\d+)[\uFF09)])\s*(.+)$/;
const markdownHeadingPattern = /^\s*#{1,4}\s+(.+)$/;
const sentenceSplitPattern = /([^\u3002\uFF01\uFF1F\uFF1B.!?;]+[\u3002\uFF01\uFF1F\uFF1B.!?;]+)(?=\s*|$)/g;

export function tagSlug(name: string) {
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || encodeURIComponent(name.trim()).replace(/%/g, "").toLowerCase();
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

function normalizeFormattedLines(value: string) {
  return normalizeLineBreaks(value)
    .split("\n")
    .map((line) => normalizeInlineSpace(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasMeaningfulLineBreaks(value: string) {
  return normalizeLineBreaks(value).split("\n").filter((line) => line.trim()).length > 1;
}

function splitDenseSentences(value: string) {
  const normalized = normalizeInlineSpace(value);
  if (!normalized) return [];

  const matches = Array.from(normalized.matchAll(sentenceSplitPattern));
  const sentences = matches.map((match) => normalizeInlineSpace(match[1])).filter(Boolean);
  const lastMatch = matches.at(-1);
  const matchedLength = lastMatch ? (lastMatch.index ?? 0) + lastMatch[0].length : 0;
  const tail = normalizeInlineSpace(normalized.slice(matchedLength));
  if (tail) sentences.push(tail);

  return sentences.length ? sentences : [normalized];
}

export function normalizeToolSummaryForStorage(value: string) {
  return normalizeLineBreaks(value).replace(/\s+/g, " ").trim();
}

export function normalizeToolContentForStorage(value: string) {
  const normalized = normalizeFormattedLines(value);
  if (!normalized) return "";
  if (hasMeaningfulLineBreaks(normalized)) return normalized;

  const sentences = splitDenseSentences(normalized);
  if (sentences.length <= 1) return normalized;

  return sentences.join("\n\n");
}

function normalizeHeadingText(value: string) {
  return normalizeInlineSpace(value).replace(/[\uFF1A:]\s*$/, "");
}

function isHeadingLine(line: string) {
  const text = normalizeInlineSpace(line);
  if (!text) return false;
  if (markdownHeadingPattern.test(text)) return true;
  if (!/[\uFF1A:]$/.test(text)) return false;
  return normalizeHeadingText(text).length <= 48;
}

function parseHeadingLine(line: string) {
  const markdown = line.match(markdownHeadingPattern);
  return normalizeHeadingText(markdown?.[1] ?? line);
}

function parseListLine(line: string) {
  const unordered = line.match(unorderedListPattern);
  if (unordered) return { type: "unordered-list" as const, text: normalizeInlineSpace(unordered[1]) };

  const ordered = line.match(orderedListPattern);
  if (ordered) {
    const marker = Number.parseInt(ordered[1] ?? ordered[2] ?? "1", 10);
    const start = Number.isFinite(marker) && marker > 0 ? marker : 1;
    return { type: "ordered-list" as const, text: normalizeInlineSpace(ordered[3] ?? ""), start };
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
  let listType: "unordered-list" | "ordered-list" | null = null;
  let orderedListStart: number | undefined;

  for (const rawLine of content.split("\n")) {
    const line = normalizeInlineSpace(rawLine);
    if (!line) {
      pushParagraphBlock(blocks, paragraphLines);
      pushListBlock(blocks, listType, listItems, orderedListStart);
      listType = null;
      orderedListStart = undefined;
      continue;
    }

    if (isHeadingLine(line)) {
      pushParagraphBlock(blocks, paragraphLines);
      pushListBlock(blocks, listType, listItems, orderedListStart);
      listType = null;
      orderedListStart = undefined;
      blocks.push({ type: "heading", text: parseHeadingLine(line) });
      continue;
    }

    const listLine = parseListLine(line);
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
