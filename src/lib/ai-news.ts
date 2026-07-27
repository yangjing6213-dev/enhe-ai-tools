import { isWeakSeoSlug, slugify } from "@/lib/admin-form";

export type NewsSort = "latest" | "hot" | "featured";

export type NewsSearchFilters = {
  q?: string;
  category?: string;
  tag?: string;
  sort: NewsSort;
  page: number;
  pageSize: number;
  skip: number;
};

export type NewsTocItem = {
  id: string;
  level: 2 | 3;
  title: string;
};

export type NewsInlinePart =
  | { type: "text"; text: string }
  | { type: "link"; href: string; text: string };

export type NewsContentBlock =
  | { type: "heading"; level: 2 | 3; id: string; text: string }
  | { type: "paragraph"; text?: string; parts?: NewsInlinePart[] }
  | { type: "image"; src: string; alt: string; caption?: string }
  | {
      type: "list";
      ordered: boolean;
      items: Array<string | { parts: NewsInlinePart[] }>;
    }
  | { type: "quote"; text: string }
  | { type: "code"; language?: string; code: string };

export const newsPageSize = 9;
const maxNewsQueryOffset = 2_147_483_647;
const maxNewsPaginationPage =
  Math.floor(maxNewsQueryOffset / newsPageSize) + 1;

export function getNewsPageCount(total: number) {
  return Math.max(1, Math.ceil(Math.max(0, total) / newsPageSize));
}

export function parseNewsPaginationPage(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const page = Number(value);
  return isNewsPaginationPageQueryable(page) ? page : null;
}

export function isNewsPaginationPageQueryable(page: number) {
  return (
    Number.isSafeInteger(page) &&
    page >= 1 &&
    page <= maxNewsPaginationPage
  );
}

export function getNewsPaginationLocales(page: number, englishTotal: number) {
  return page <= getNewsPageCount(englishTotal)
    ? (["zh", "en"] as const)
    : (["zh"] as const);
}

export function isNewsPaginationPageInRange(page: number, total: number) {
  return (
    isNewsPaginationPageQueryable(page) &&
    page >= 2 &&
    page <= getNewsPageCount(total)
  );
}

export function hasActiveNewsFilters(
  filters: Pick<NewsSearchFilters, "q" | "category" | "tag" | "sort">,
) {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.tag ||
      filters.sort !== "latest",
  );
}

export function resolveNewsSlug({
  title,
  slugInput,
  fallbackSeed,
}: {
  title: string;
  slugInput?: string | null;
  fallbackSeed: string;
}) {
  const manualSlug = slugInput ? slugify(slugInput) : "";
  if (manualSlug) return manualSlug;

  const titleSlug = slugify(title);
  if (titleSlug) return titleSlug;

  return `news-${slugify(fallbackSeed) || "item"}`;
}

export function resolveAiNewsCanonicalSlug({
  slug,
  title,
  englishTitle,
}: {
  slug: string;
  title: string;
  englishTitle?: string | null;
}) {
  const normalizedSlug = slugify(slug);
  if (!isWeakSeoSlug(normalizedSlug)) {
    return normalizedSlug;
  }

  const englishSlug = slugify(englishTitle ?? "");
  if (englishSlug && englishSlug !== normalizedSlug) {
    return englishSlug;
  }

  const titleSlug = slugify(title);
  if (titleSlug && titleSlug !== normalizedSlug) {
    return titleSlug;
  }

  return normalizedSlug;
}

function normalizeStringParam(value: string | undefined) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

export function parseNewsSearchParams(
  params: Record<string, string | undefined>,
): NewsSearchFilters {
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const sort =
    params.sort === "hot" || params.sort === "featured"
      ? params.sort
      : "latest";

  return {
    q: normalizeStringParam(params.q),
    category: normalizeStringParam(params.category),
    tag: normalizeStringParam(params.tag),
    sort,
    page,
    pageSize: newsPageSize,
    skip: isNewsPaginationPageQueryable(page)
      ? (page - 1) * newsPageSize
      : 0,
  };
}

export function escapeNewsText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHeadingPrefix(line: string) {
  return line.replace(/^#{2,3}\s+/, "").trim();
}

export function extractNewsTableOfContents(content: string): NewsTocItem[] {
  let count = 0;
  return content
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(##|###)\s+(.+)$/);
      if (!match) return null;
      count += 1;
      return {
        id: `section-${count}`,
        level: match[1] === "###" ? 3 : 2,
        title: stripHeadingPrefix(line),
      } satisfies NewsTocItem;
    })
    .filter((item): item is NewsTocItem => Boolean(item));
}

function pushParagraph(lines: string[], blocks: NewsContentBlock[]) {
  const text = lines.join(" ").trim();
  if (text) blocks.push(inlineTextBlock(text));
  lines.length = 0;
}

function pushList(
  items: string[],
  ordered: boolean,
  blocks: NewsContentBlock[],
) {
  if (!items.length) return;
  blocks.push({ type: "list", ordered, items: items.map(inlineListItem) });
  items.length = 0;
}

function isHttpNewsMediaUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function parseMarkdownImage(line: string) {
  const match = line.match(/^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]+)")?\)$/);
  if (!match) return null;

  const src = match[2].trim();
  if (!isHttpNewsMediaUrl(src)) return null;

  const alt = match[1].trim();
  const caption = match[3]?.trim();
  return {
    type: "image" as const,
    src,
    alt,
    ...(caption ? { caption: escapeNewsText(caption) } : {}),
  };
}

function normalizeInternalNewsHref(href: string) {
  const trimmed = href.trim();
  if (/^https:\/\/www\.enhe-tech\.com\.cn\//i.test(trimmed)) {
    return trimmed.replace(/^https:\/\/www\.enhe-tech\.com\.cn/i, "") || "/";
  }
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/[\s"'<>]/.test(trimmed)) return null;
  return trimmed;
}

function parseInlineParts(value: string): NewsInlinePart[] {
  const parts: NewsInlinePart[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    const before = value.slice(cursor, match.index);
    if (before) parts.push({ type: "text", text: escapeNewsText(before) });

    const href = normalizeInternalNewsHref(match[2]);
    const text = match[1].trim();
    if (href && text) {
      parts.push({ type: "link", href, text: escapeNewsText(text) });
    } else {
      parts.push({ type: "text", text: escapeNewsText(text || match[0]) });
    }
    cursor = pattern.lastIndex;
  }

  const rest = value.slice(cursor);
  if (rest) parts.push({ type: "text", text: escapeNewsText(rest) });
  return parts.length ? parts : [{ type: "text", text: escapeNewsText(value) }];
}

function hasInlineLink(parts: NewsInlinePart[]) {
  return parts.some((part) => part.type === "link");
}

function inlineTextBlock(
  value: string,
): Extract<NewsContentBlock, { type: "paragraph" }> {
  const parts = parseInlineParts(value);
  return hasInlineLink(parts)
    ? { type: "paragraph", parts }
    : { type: "paragraph", text: parts.map((part) => part.text).join("") };
}

function inlineListItem(value: string): string | { parts: NewsInlinePart[] } {
  const parts = parseInlineParts(value);
  return hasInlineLink(parts)
    ? { parts }
    : parts.map((part) => part.text).join("");
}

export function renderNewsContentBlocks(content: string): NewsContentBlock[] {
  const blocks: NewsContentBlock[] = [];
  const paragraphLines: string[] = [];
  const listItems: string[] = [];
  let currentListOrdered = false;
  let headingCount = 0;
  let inCode = false;
  let codeLanguage = "";
  const codeLines: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const codeFence = line.match(/^```(.*)$/);
    if (codeFence) {
      if (inCode) {
        blocks.push({
          type: "code",
          language: codeLanguage || undefined,
          code: codeLines.join("\n"),
        });
        codeLines.length = 0;
        codeLanguage = "";
        inCode = false;
      } else {
        pushParagraph(paragraphLines, blocks);
        pushList(listItems, currentListOrdered, blocks);
        codeLanguage = codeFence[1].trim();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      pushParagraph(paragraphLines, blocks);
      pushList(listItems, currentListOrdered, blocks);
      continue;
    }

    const heading = line.match(/^(##|###)\s+(.+)$/);
    if (heading) {
      pushParagraph(paragraphLines, blocks);
      pushList(listItems, currentListOrdered, blocks);
      headingCount += 1;
      blocks.push({
        type: "heading",
        level: heading[1] === "###" ? 3 : 2,
        id: `section-${headingCount}`,
        text: escapeNewsText(stripHeadingPrefix(line)),
      });
      continue;
    }

    const image = parseMarkdownImage(line.trim());
    if (image) {
      pushParagraph(paragraphLines, blocks);
      pushList(listItems, currentListOrdered, blocks);
      blocks.push(image);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      pushParagraph(paragraphLines, blocks);
      const nextOrdered = Boolean(ordered);
      if (listItems.length && currentListOrdered !== nextOrdered) {
        pushList(listItems, currentListOrdered, blocks);
      }
      currentListOrdered = nextOrdered;
      listItems.push((unordered?.[1] ?? ordered?.[1] ?? "").trim());
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      pushParagraph(paragraphLines, blocks);
      pushList(listItems, currentListOrdered, blocks);
      blocks.push({ type: "quote", text: escapeNewsText(quote[1]) });
      continue;
    }

    pushList(listItems, currentListOrdered, blocks);
    paragraphLines.push(line.trim());
  }

  if (inCode) {
    blocks.push({
      type: "code",
      language: codeLanguage || undefined,
      code: codeLines.join("\n"),
    });
  }
  pushParagraph(paragraphLines, blocks);
  pushList(listItems, currentListOrdered, blocks);

  return blocks;
}

const hanCharacterPattern = /\p{Script=Han}/gu;
const hanSequencePattern = /\p{Script=Han}+/gu;
const englishAndHanCharacterPattern = /[A-Za-z]|\p{Script=Han}/gu;
const englishWordPattern = /[A-Za-z][A-Za-z0-9'+-]*/g;
export const maxIncidentalEnglishNewsHanCharacters = 8;
export const maxEnglishNewsHanCharacterRatio = 0.05;

function normalizeEnglishCandidate(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function countEnglishWords(value: string) {
  return value.match(englishWordPattern)?.length ?? 0;
}

function hasAcceptableEnglishNewsHanMix(value: string) {
  const hanCharacterCount = value.match(hanCharacterPattern)?.length ?? 0;
  const hasOversizedHanSequence = (value.match(hanSequencePattern) ?? []).some(
    (sequence) => Array.from(sequence).length > maxIncidentalEnglishNewsHanCharacters,
  );
  if (hasOversizedHanSequence) return false;
  if (hanCharacterCount <= maxIncidentalEnglishNewsHanCharacters) return true;

  const comparableCharacterCount =
    value.match(englishAndHanCharacterPattern)?.length ?? 0;
  return (
    comparableCharacterCount > 0 &&
    hanCharacterCount / comparableCharacterCount <=
      maxEnglishNewsHanCharacterRatio
  );
}

export function isUsableEnglishNewsText(
  value: string | null | undefined,
  minimumWords: number,
) {
  const normalized = normalizeEnglishCandidate(value);
  if (!normalized || !hasAcceptableEnglishNewsHanMix(normalized)) return false;
  return countEnglishWords(normalized) >= minimumWords;
}

export function isEnglishNewsArticleIndexable(article: {
  englishTitle?: string | null;
  englishSummary?: string | null;
  englishContent?: string | null;
}) {
  const title = normalizeEnglishCandidate(article.englishTitle);
  const summary = normalizeEnglishCandidate(article.englishSummary);
  const content = normalizeEnglishCandidate(article.englishContent);

  return (
    title.length >= 12 &&
    summary.length >= 24 &&
    content.length >= 180 &&
    isUsableEnglishNewsText(title, 3) &&
    isUsableEnglishNewsText(summary, 8) &&
    isUsableEnglishNewsText(content, 45)
  );
}

export function resolveLocalizedNewsContent(
  sourceContent: string,
  localizedContent: string | null | undefined,
  locale: "zh" | "en",
) {
  if (locale !== "en") return sourceContent;

  const normalizedLocalizedContent = localizedContent?.trim();
  return normalizedLocalizedContent || sourceContent;
}

function looksLikeDateOnlyDescription(value: string) {
  const text = value.trim();
  return (
    /^\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?$/.test(text) ||
    /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(text) ||
    /^\d{1,2} [A-Z][a-z]+ \d{4}$/.test(text)
  );
}

function looksLikeGenericAiNewsDescription(value: string) {
  const text = value.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    text ===
      "live in symbiosis with ai, awaken in this era, and define the future through creation." ||
    text.includes("live in symbiosis with ai, awaken in this era") ||
    text.includes("define the future through creation") ||
    text.includes("enhe ai helps users apply ai to real tasks") ||
    text.includes("work faster, create content, organize material")
  );
}

function isValidAiNewsMetaDescription(value: string, minLength: number) {
  return (
    value.length >= minLength &&
    !looksLikeDateOnlyDescription(value) &&
    !looksLikeGenericAiNewsDescription(value)
  );
}

function normalizeAiNewsMetaCandidate(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveAiNewsMetaDescription(
  candidates: Array<string | null | undefined>,
  fallback: string,
  minLength = 24,
) {
  const validCandidate = candidates
    .map((candidate) => normalizeAiNewsMetaCandidate(candidate))
    .find((candidate) => isValidAiNewsMetaDescription(candidate, minLength));
  const normalizedFallback = normalizeAiNewsMetaCandidate(fallback);
  const validFallback = isValidAiNewsMetaDescription(normalizedFallback, minLength)
    ? normalizedFallback
    : "";

  if (!validCandidate) return truncateAiNewsMetaDescription(validFallback, 150);

  const targetLength = /[\u4e00-\u9fff]/.test(validCandidate) ? 70 : 110;
  if (validCandidate.length >= targetLength || validFallback.length < targetLength) {
    return truncateAiNewsMetaDescription(validCandidate, 150);
  }

  if (validFallback.includes(validCandidate)) {
    return truncateAiNewsMetaDescription(validFallback, 150);
  }

  if (validCandidate.includes(validFallback)) {
    return truncateAiNewsMetaDescription(validCandidate, 150);
  }

  return truncateAiNewsMetaDescription(`${validCandidate} ${validFallback}`, 150);
}

export function buildAiNewsDescriptionFallback({
  title,
  categoryName,
  locale,
}: {
  title: string;
  categoryName?: string | null;
  locale: "zh" | "en";
}) {
  const normalizedTitle = normalizeAiNewsMetaCandidate(title);
  const normalizedCategory = normalizeAiNewsMetaCandidate(categoryName);

  if (locale === "en") {
    const topic = normalizedCategory
      ? `${normalizedCategory} topic`
      : "AI trend";
    return truncateAiNewsMetaDescription(
      `Read ENHE AI's analysis of ${normalizedTitle || topic}, including the key facts, practical impact, related tools, tutorials, and next steps for AI workflows.`,
      150,
    );
  }

  const topic = normalizedCategory ? `“${normalizedCategory}”方向` : "AI趋势";
  return truncateAiNewsMetaDescription(
    `阅读 ENHE AI 对${normalizedTitle ? `“${normalizedTitle}”` : topic}的资讯解读，了解发生了什么、为什么重要、对普通AI用户的实际影响、相关工具教程、来源线索、风险边界和下一步落地建议。`,
    150,
  );
}

const asciiTokenCharacterPattern = /[A-Za-z0-9._+#/@?%=&~:\-]/;

function isAsciiTokenCharacter(value: string | undefined) {
  return Boolean(value && asciiTokenCharacterPattern.test(value));
}

function findAsciiTokenSafeEnd(value: string, maxLength: number) {
  let end = maxLength;
  if (
    isAsciiTokenCharacter(value.charAt(end - 1)) &&
    isAsciiTokenCharacter(value.charAt(end))
  ) {
    while (end > 0 && isAsciiTokenCharacter(value.charAt(end - 1))) {
      end -= 1;
    }
  }
  return end;
}

export function truncateAiNewsMetaDescription(value: string, maxLength: number) {
  const normalized = normalizeAiNewsMetaCandidate(value);
  if (normalized.length <= maxLength) return normalized;
  if (maxLength <= 0) return "";

  const end = findAsciiTokenSafeEnd(normalized, maxLength);
  if (end === 0) {
    const firstWhitespace = normalized.search(/\s/);
    if (firstWhitespace > 0) {
      const remainder = normalized.slice(firstWhitespace).trim();
      if (remainder) {
        return truncateAiNewsMetaDescription(remainder, maxLength);
      }
    }
    return buildStableAiNewsReference(normalized, maxLength);
  }

  const candidate = normalized.slice(0, end).trimEnd();
  const naturalBreak = Math.max(
    ...["：", "、", "，", "；", "。", "！", "？", ":", ",", ";", "!", "?"].map(
      (separator) => candidate.lastIndexOf(separator),
    ),
  );
  const preferred =
    naturalBreak >= Math.floor(end * 0.6)
      ? candidate.slice(0, naturalBreak).trimEnd()
      : candidate;

  return preferred.replace(/[、，；：,:;\-–—|｜/\s]+$/g, "").trim();
}

function stripGenericEnglishNewsTitlePrefix(value: string) {
  return value
    .replace(/^how\s+enhe\s+ai\s+helps\s+users\s+understand\s+/i, "")
    .replace(/^enhe\s+ai\s+helps\s+users\s+understand\s+/i, "")
    .trim();
}

function cleanAiNewsSerpTitle(value: string) {
  return normalizeAiNewsMetaCandidate(value)
    .replace(/\s*(?:[|｜\-–—:：]\s*)?(?:影响解读|Impact Analysis)\s*$/i, "")
    .replace(/(?:\s*[|｜]\s*){2,}/g, " | ")
    .replace(/\s+/g, " ")
    .replace(/\s+([、，；。！？,:;!?])/g, "$1")
    .replace(/[\s、，；。！？,:;!?\-–—|｜/]+$/g, "")
    .replace(/(?:\s*[|｜:：、，；。！？,;!?\-–—/])+\s*$/u, "")
    .trim();
}

function isSingleOversizedAsciiToken(value: string, maxLength: number) {
  return (
    value.length > maxLength &&
    value.length > 0 &&
    Array.from(value).every((character) => isAsciiTokenCharacter(character))
  );
}

function buildReadableAsciiTokenTitle(value: string, maxLength: number) {
  const words = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (words.length < 2) return "";

  let title = "";
  for (const word of words) {
    const candidate = title ? `${title} ${word}` : word;
    if (candidate.length > maxLength) {
      if (!title) continue;
      break;
    }
    title = candidate;
  }
  return title;
}

function buildStableAiNewsFingerprint(value: string) {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36).padStart(6, "0").slice(-6);
}

function buildStableAiNewsReference(value: string, maxLength: number) {
  const fingerprint = buildStableAiNewsFingerprint(value);
  for (const label of ["Reference", "Ref"]) {
    const reference = `${label} ${fingerprint}`;
    if (reference.length <= maxLength) return reference;
  }
  return fingerprint.slice(0, maxLength);
}

function buildOversizedAsciiTokenTitle({
  value,
  categoryName,
  maxLength,
}: {
  value: string;
  categoryName: string;
  maxLength: number;
}) {
  const readableTitle = buildReadableAsciiTokenTitle(value, maxLength);
  if (readableTitle) return readableTitle;

  const fingerprint = buildStableAiNewsFingerprint(value);
  for (const label of [categoryName, "AI"]) {
    const candidate = `${label} ${fingerprint}`.trim();
    if (candidate.length <= maxLength) return candidate;
  }
  return maxLength >= fingerprint.length ? fingerprint : "";
}

function truncateAiNewsSerpTitle(
  value: string,
  maxLength: number,
  locale: "zh" | "en",
) {
  const cleaned = cleanAiNewsSerpTitle(value);
  if (maxLength <= 0) return "";
  if (cleaned.length <= maxLength) return cleaned;

  const end = findAsciiTokenSafeEnd(cleaned, maxLength);

  const candidate = cleaned.slice(0, end).trimEnd();
  if (locale === "zh") {
    const naturalBreak = Math.max(
      ...["：", "、", "，", "；", "。", "！", "？"].map((separator) =>
        candidate.lastIndexOf(separator),
      ),
    );
    if (naturalBreak >= Math.floor(maxLength * 0.45)) {
      return cleanAiNewsSerpTitle(candidate.slice(0, naturalBreak));
    }
  }

  return cleanAiNewsSerpTitle(candidate);
}

export function buildAiNewsSerpTitle({
  title,
  categoryName,
  locale,
  maxLength,
}: {
  title: string;
  categoryName?: string | null;
  locale: "zh" | "en";
  maxLength: number;
}) {
  if (maxLength <= 0) return "";
  if (maxLength === 1) return "";
  if (maxLength <= 5) return "AI";

  const normalizedTitle = normalizeAiNewsMetaCandidate(title);
  const normalizedCategory = cleanAiNewsSerpTitle(categoryName ?? "");
  const localizedTitle =
    locale === "en"
      ? stripGenericEnglishNewsTitlePrefix(normalizedTitle)
      : normalizedTitle;
  const source = cleanAiNewsSerpTitle(localizedTitle) || normalizedCategory || "AI";
  const compactTitle = truncateAiNewsSerpTitle(source, maxLength, locale);
  if (compactTitle) return compactTitle;

  if (isSingleOversizedAsciiToken(source, maxLength)) {
    return buildOversizedAsciiTokenTitle({
      value: source,
      categoryName: normalizedCategory,
      maxLength,
    });
  }

  return (
    truncateAiNewsSerpTitle(normalizedCategory, maxLength, locale) ||
    (maxLength >= "AI".length ? "AI" : "")
  );
}

export function parseNewsRelationIds(value: string | null | undefined) {
  const seen = new Set<string>();
  return String(value ?? "")
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

const genericRelatedKeywordSet = new Set([
  "ai",
  "ai资讯",
  "ai快讯",
  "自动发布",
  "ai前沿",
  "enhe",
  "恩禾",
  "恩禾enhe ai",
]);

export function buildAiNewsRelatedKeywords({
  keywords,
  seoKeywords,
  categoryName,
  tagNames,
}: {
  title?: string | null;
  keywords?: string | null;
  seoKeywords?: string | null;
  categoryName?: string | null;
  tagNames?: string[];
}) {
  const seen = new Set<string>();
  return [
    ...(tagNames ?? []),
    keywords ?? "",
    seoKeywords ?? "",
    categoryName ?? "",
  ]
    .flatMap((value) => String(value).split(/[,\n，、|]/))
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
    .filter((item) => {
      const key = item.toLowerCase().replace(/\s+/g, "");
      if (genericRelatedKeywordSet.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export function mergeAiNewsRelatedItems<T extends { id: string }>(
  groups: T[][],
  limit: number,
) {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
      if (merged.length >= limit) return merged;
    }
  }

  return merged;
}

export function resolveNewsVideo(
  article: {
    videoUrl?: string | null;
    videoTitle?: string | null;
    videoDescription?: string | null;
  },
  fallbackTitle: string,
) {
  const url = String(article.videoUrl ?? "").trim();
  if (!isHttpNewsMediaUrl(url)) return null;

  const title = String(article.videoTitle ?? "").trim() || fallbackTitle;
  const description = String(article.videoDescription ?? "").trim();
  return {
    url,
    title,
    ...(description ? { description } : {}),
  };
}

export function toNewsIsoDate(value: Date | string) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
