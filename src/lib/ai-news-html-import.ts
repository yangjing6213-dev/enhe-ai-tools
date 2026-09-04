import type { AiNewsImportPayload } from "@/lib/ai-news-import";

type PublishMode = "draft" | "published";

export type AiNewsHtmlImportInput = {
  html: string;
  publishMode?: PublishMode;
  importBatchId?: string;
  categoryName?: string;
  categorySlug?: string;
  tags?: string[];
  preferCmsArticleFields?: boolean;
};

const defaultDraftSource = {
  title: "ENHE AI",
  url: "https://www.enhe-tech.com.cn/",
  sourceType: "internal"
};

const maxHtmlChars = 80_000;

function rejectUnsafeHtml(html: string) {
  if (/<script[\s>]/i.test(html) || /<\/script\s*>/i.test(html)) {
    throw new Error("HTML cannot contain script tags.");
  }

  if (/<style[\s>]/i.test(html) || /<\/style\s*>/i.test(html)) {
    throw new Error("HTML cannot contain style tags.");
  }

  if (/<[a-z][^>]*\sstyle\s*=/i.test(html)) {
    throw new Error("HTML cannot contain style attributes.");
  }

  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) {
    throw new Error("HTML cannot contain inline event handlers.");
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function normalizeWhitespace(value: string) {
  return decodeHtmlEntities(value.replace(/\s+/g, " ")).trim();
}

function stripTags(value: string) {
  return normalizeWhitespace(value.replace(/<[^>]+>/g, " "));
}

function getAttribute(tag: string, name: string) {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  return normalizeWhitespace(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function firstMatch(html: string, pattern: RegExp) {
  return html.match(pattern)?.[1] ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaContent(html: string, name: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (getAttribute(tag, "name").toLowerCase() === name.toLowerCase()) {
      return getAttribute(tag, "content");
    }
  }
  return "";
}

function extractCanonicalUrl(html: string) {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const rel = getAttribute(tag, "rel").toLowerCase().split(/\s+/);
    if (!rel.includes("canonical")) continue;
    const href = getAttribute(tag, "href");
    if (isHttpUrl(href)) return href;
  }
  return "";
}

function extractTitle(html: string) {
  const h1 = stripTags(firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i));
  const title = h1 || extractMetaContent(html, "title") || stripTags(firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i));
  if (!title) throw new Error("HTML import requires one h1 title.");
  return title.slice(0, 180);
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function extractCoverImage(html: string) {
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imageTags) {
    const src = getAttribute(tag, "src");
    if (isHttpUrl(src)) return src;
  }
  return undefined;
}

type HtmlImage = {
  src: string;
  alt: string;
  caption?: string;
};

function escapeMarkdownImageText(value: string) {
  return normalizeWhitespace(value).replace(/"/g, "'");
}

function extractImageFromTag(tag: string, caption?: string): HtmlImage | null {
  const src = getAttribute(tag, "src");
  if (!isHttpUrl(src)) return null;

  return {
    src,
    alt: getAttribute(tag, "alt"),
    ...(caption ? { caption: stripTags(caption) } : {})
  };
}

function imageToMarkdown(image: HtmlImage) {
  const alt = escapeMarkdownImageText(image.alt);
  const caption = image.caption ? escapeMarkdownImageText(image.caption) : "";
  return caption ? `![${alt}](${image.src} "${caption}")` : `![${alt}](${image.src})`;
}

function extractPublishedAt(html: string, publishMode: PublishMode) {
  if (publishMode !== "published") return undefined;
  const timeTags = html.match(/<time\b[^>]*>/gi) ?? [];
  for (const tag of timeTags) {
    const datetime = getAttribute(tag, "datetime");
    if (!datetime) continue;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(datetime) ? new Date(`${datetime}T00:00:00.000Z`) : new Date(datetime);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

function splitKeywords(value: string) {
  return value
    .split(/[,，;；、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeText(items: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

function textWithLineBreaks(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|section|article|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .join("\n");
}

function extractListItems(innerHtml: string) {
  return (innerHtml.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) ?? [])
    .map((item) => stripTags(item))
    .filter(Boolean);
}

function splitFieldItems(value: string) {
  return value
    .split(/[\r\n,，;；、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractItemsFromField(innerHtml: string) {
  const listItems = extractListItems(innerHtml);
  if (listItems.length) return dedupeText(listItems);
  return dedupeText(splitFieldItems(textWithLineBreaks(innerHtml)));
}

function extractTags(html: string, inputTags: string[] | undefined, cmsTags: string[]) {
  return dedupeText([...splitKeywords(extractMetaContent(html, "keywords")), ...cmsTags, ...(inputTags ?? [])]).slice(0, 20);
}

function isSourceHeading(text: string) {
  return /^(来源|消息来源|参考来源|sources?|references?)$/i.test(text.trim());
}

function extractSourceSection(html: string) {
  const headingPattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>|<h3\b[^>]*>([\s\S]*?)<\/h3>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(html))) {
    const headingText = stripTags(match[1] ?? match[2] ?? "");
    if (!isSourceHeading(headingText)) continue;
    const start = headingPattern.lastIndex;
    const next = html.slice(start).search(/<h2\b|<h3\b/i);
    return next === -1 ? html.slice(start) : html.slice(start, start + next);
  }
  return "";
}

function extractSources(html: string, publishMode: PublishMode) {
  const sourceHtml = extractSourceSection(html) || html;
  const anchorTags = sourceHtml.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) ?? [];
  const sources = anchorTags
    .map((anchor) => {
      const openTag = anchor.match(/<a\b[^>]*>/i)?.[0] ?? "";
      const url = getAttribute(openTag, "href");
      const title = stripTags(anchor) || url;
      return isHttpUrl(url) && title ? { title: title.slice(0, 220), url, sourceType: "source" } : null;
    })
    .filter((source): source is { title: string; url: string; sourceType: string } => Boolean(source));

  const deduped = new Map<string, { title: string; url: string; sourceType: string }>();
  for (const source of sources) {
    if (!deduped.has(source.url)) deduped.set(source.url, source);
  }

  const result = Array.from(deduped.values()).slice(0, 12);
  if (publishMode === "published" && result.length === 0) {
    throw new Error("Published HTML imports require at least one source link.");
  }

  return result.length ? result : [defaultDraftSource];
}

function extractBalancedElementFromStart(html: string, start: number, tagName: string) {
  const tagPattern = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html))) {
    const tag = match[0];
    const isClosing = /^<\//.test(tag);
    const isSelfClosing = /\/>$/.test(tag);

    if (isClosing) {
      depth -= 1;
    } else if (!isSelfClosing) {
      depth += 1;
    }

    if (depth === 0) {
      return html.slice(start, tagPattern.lastIndex);
    }
  }

  return "";
}

function extractElementOuterHtmlById(html: string, id: string) {
  const tagPattern = /<([a-z][a-z0-9:-]*)\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html))) {
    const openTag = match[0];
    if (getAttribute(openTag, "id") !== id) continue;
    return extractBalancedElementFromStart(html, match.index, match[1]);
  }

  return "";
}

function stripWrappingTag(outerHtml: string) {
  const openTag = outerHtml.match(/^<([a-z][a-z0-9:-]*)\b[^>]*>/i);
  if (!openTag) return outerHtml;
  const tagName = openTag[1];
  return outerHtml.slice(openTag[0].length).replace(new RegExp(`</${escapeRegExp(tagName)}>\\s*$`, "i"), "");
}

function removeElementById(html: string, id: string) {
  let result = html;
  for (let index = 0; index < 20; index += 1) {
    const outerHtml = extractElementOuterHtmlById(result, id);
    if (!outerHtml) return result;
    result = result.replace(outerHtml, "");
  }
  return result;
}

function removeTagBlocks(html: string, tagName: string) {
  return html.replace(new RegExp(`<${escapeRegExp(tagName)}\\b[\\s\\S]*?</${escapeRegExp(tagName)}>`, "gi"), "");
}

function shouldSkipBlock(tagName: string, innerHtml: string) {
  if (tagName === "h1" || tagName === "time") return true;
  if ((tagName === "h2" || tagName === "h3") && isSourceHeading(stripTags(innerHtml))) return true;
  return false;
}

function convertInlineText(html: string) {
  return stripTags(convertSafeInternalAnchorsToMarkdown(html));
}

function normalizeInternalHref(value: string) {
  const href = value.trim();
  if (/^https:\/\/www\.enhe-tech\.com\.cn\//i.test(href)) {
    return href.replace(/^https:\/\/www\.enhe-tech\.com\.cn/i, "") || "/";
  }
  if (!href.startsWith("/") || href.startsWith("//")) return "";
  if (/[\s"'<>]/.test(href)) return "";
  return href;
}

function escapeMarkdownLinkText(value: string) {
  return value.replace(/[[\]]/g, "").trim();
}

function convertSafeInternalAnchorsToMarkdown(html: string) {
  return html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => {
    const openTag = anchor.match(/<a\b[^>]*>/i)?.[0] ?? "";
    const href = normalizeInternalHref(getAttribute(openTag, "href"));
    const text = escapeMarkdownLinkText(stripTags(anchor));
    if (!href || !text) return text;
    return `[${text}](${href})`;
  });
}

function convertList(innerHtml: string, ordered: boolean) {
  const items = (innerHtml.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) ?? [])
    .map((item) => convertInlineText(item))
    .filter(Boolean);
  return items.map((item, index) => (ordered ? `${index + 1}. ${item}` : `- ${item}`)).join("\n");
}

function convertPre(innerHtml: string) {
  const code = decodeHtmlEntities(innerHtml.replace(/<\/?code\b[^>]*>/gi, "").replace(/<[^>]+>/g, "")).trim();
  return code ? `\`\`\`\n${code}\n\`\`\`` : "";
}

function convertImageBlock(outerHtml: string) {
  const imageTag = outerHtml.match(/<img\b[^>]*>/i)?.[0] ?? "";
  if (!imageTag) return null;

  const caption = firstMatch(outerHtml, /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
  const image = extractImageFromTag(imageTag, caption);
  return image ? imageToMarkdown(image) : null;
}

function convertBlocksToMarkdown(html: string, { requireContent = true, skipFeaturedImage = true } = {}) {
  const blocks: string[] = [];
  const coverImage = skipFeaturedImage ? extractCoverImage(html) : undefined;
  const blockPattern = /<(h1|h2|h3|p|ul|ol|blockquote|pre|figure)\b[^>]*>[\s\S]*?<\/\1>|<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  let skippingSources = false;

  while ((match = blockPattern.exec(html))) {
    const outerHtml = match[0];
    const openTag = outerHtml.match(/^<([a-z][a-z0-9:-]*)\b[^>]*>/i);
    if (!openTag) continue;

    const tagName = openTag[1].toLowerCase();
    const innerHtml = tagName === "img" ? "" : stripWrappingTag(outerHtml);
    const text = convertInlineText(innerHtml);

    if (shouldSkipBlock(tagName, innerHtml)) {
      if ((tagName === "h2" || tagName === "h3") && isSourceHeading(text)) {
        skippingSources = true;
      }
      continue;
    }
    if (skippingSources) continue;

    if (tagName === "figure" || tagName === "img") {
      const imageMarkdown = convertImageBlock(outerHtml);
      if (!imageMarkdown) continue;
      const imageSrc = outerHtml.match(/<img\b[^>]*>/i)?.[0] ? getAttribute(outerHtml.match(/<img\b[^>]*>/i)?.[0] ?? "", "src") : "";
      if (coverImage && imageSrc === coverImage) {
        continue;
      }
      blocks.push(imageMarkdown);
      continue;
    }

    if (!text && tagName !== "pre") continue;

    if (tagName === "h2") blocks.push(`## ${text}`);
    if (tagName === "h3") blocks.push(`### ${text}`);
    if (tagName === "p") blocks.push(text);
    if (tagName === "blockquote") blocks.push(`> ${text}`);
    if (tagName === "ul") {
      const list = convertList(innerHtml, false);
      if (list) blocks.push(list);
    }
    if (tagName === "ol") {
      const list = convertList(innerHtml, true);
      if (list) blocks.push(list);
    }
    if (tagName === "pre") {
      const pre = convertPre(innerHtml);
      if (pre) blocks.push(pre);
    }
  }

  const content = blocks.join("\n\n").trim() || textWithLineBreaks(html);
  if (!content && requireContent) throw new Error("HTML import requires article body content.");
  return content.slice(0, 50_000);
}

function removeLeadingHeading(html: string) {
  return html.replace(/^\s*<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>\s*/i, "");
}

function normalizeFieldLabel(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

const cmsFieldAliases = new Map(
  [
    ["title", "title"],
    ["content", "content"],
    ["subtitle", "subtitle"],
    ["副标题", "subtitle"],
    ["summary", "summary"],
    ["一句话摘要", "summary"],
    ["摘要", "summary"],
    ["description", "description"],
    ["描述", "description"],
    ["keywords", "keywords"],
    ["关键词", "keywords"],
    ["keytakeaways", "keyTakeaways"],
    ["takeaways", "keyTakeaways"],
    ["核心要点每行一条", "keyTakeaways"],
    ["核心要点", "keyTakeaways"],
    ["impactnotes", "impactNotes"],
    ["impact", "impactNotes"],
    ["这对用户意味着什么", "impactNotes"],
    ["对用户意味着什么", "impactNotes"],
    ["conclusion", "conclusion"],
    ["总结", "conclusion"],
    ["videourl", "videoUrl"],
    ["视频url", "videoUrl"],
    ["视频链接", "videoUrl"],
    ["videotitle", "videoTitle"],
    ["视频标题", "videoTitle"],
    ["videodescription", "videoDescription"],
    ["视频说明", "videoDescription"],
    ["seotitle", "seoTitle"],
    ["seo标题", "seoTitle"],
    ["seodescription", "seoDescription"],
    ["seo描述", "seoDescription"],
    ["seokeywords", "seoKeywords"],
    ["seo关键词", "seoKeywords"],
    ["canonicalurl", "canonicalUrl"],
    ["canonical", "canonicalUrl"],
    ["englishtitle", "englishTitle"],
    ["englishsubtitle", "englishSubtitle"],
    ["englishdescription", "englishDescription"],
    ["englishsummary", "englishSummary"],
    ["englishcontent", "englishContent"],
    ["englishkeywords", "englishKeywords"],
    ["englishkeytakeaways", "englishKeyTakeaways"],
    ["englishtakeaways", "englishKeyTakeaways"],
    ["englishimpactnotes", "englishImpactNotes"],
    ["englishconclusion", "englishConclusion"],
    ["englishseotitle", "englishSeoTitle"],
    ["englishseodescription", "englishSeoDescription"],
    ["englishseokeywords", "englishSeoKeywords"],
    ["tags", "tags"],
    ["标签逗号或换行分隔", "tags"],
    ["标签", "tags"],
    ["relatedarticleids", "relatedArticleIds"],
    ["相关资讯id", "relatedArticleIds"],
    ["relatedtoolids", "relatedToolIds"],
    ["相关工具id", "relatedToolIds"],
    ["relatedtutorialids", "relatedTutorialIds"],
    ["相关教程id", "relatedTutorialIds"]
  ].map(([alias, key]) => [normalizeFieldLabel(alias), key])
);

type CmsField = {
  bodyHtml: string;
  text: string;
  markdown: string;
  items: string[];
};

function canonicalCmsFieldKey(value: string) {
  return cmsFieldAliases.get(normalizeFieldLabel(value)) ?? "";
}

function createCmsField(bodyHtml: string, preserveFirstImage = false): CmsField {
  const body = removeLeadingHeading(bodyHtml).trim();
  return {
    bodyHtml: body,
    text: textWithLineBreaks(body),
    markdown: convertBlocksToMarkdown(body, { requireContent: false, skipFeaturedImage: !preserveFirstImage }),
    items: extractItemsFromField(body)
  };
}

function extractCmsFields(html: string, preserveFirstImage = false) {
  const cmsOuterHtml = extractElementOuterHtmlById(html, "cms-fields");
  const fields = new Map<string, CmsField>();
  if (!cmsOuterHtml) return fields;

  const cmsInnerHtml = stripWrappingTag(cmsOuterHtml);
  const dataFieldPattern = /<([a-z][a-z0-9:-]*)\b[^>]*\sdata-field\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*>[\s\S]*?<\/\1>/gi;
  let dataMatch: RegExpExecArray | null;

  while ((dataMatch = dataFieldPattern.exec(cmsInnerHtml))) {
    const outerHtml = dataMatch[0];
    const openTag = outerHtml.match(/^<([a-z][a-z0-9:-]*)\b[^>]*>/i)?.[0] ?? "";
    const key = canonicalCmsFieldKey(getAttribute(openTag, "data-field"));
    if (!key || fields.has(key)) continue;
    fields.set(key, createCmsField(stripWrappingTag(outerHtml), preserveFirstImage));
  }

  const headingPattern = /<h[3-4]\b[^>]*>([\s\S]*?)<\/h[3-4]>/gi;
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingPattern.exec(cmsInnerHtml))) {
    const key = canonicalCmsFieldKey(stripTags(headingMatch[1]));
    if (!key || fields.has(key)) continue;
    const start = headingPattern.lastIndex;
    const nextHeadingIndex = cmsInnerHtml.slice(start).search(/<h[3-4]\b/i);
    const bodyHtml = nextHeadingIndex === -1 ? cmsInnerHtml.slice(start) : cmsInnerHtml.slice(start, start + nextHeadingIndex);
    fields.set(key, createCmsField(bodyHtml, preserveFirstImage));
  }

  return fields;
}

function cmsText(fields: Map<string, CmsField>, key: string) {
  return fields.get(key)?.text.trim() ?? "";
}

function cmsMarkdown(fields: Map<string, CmsField>, key: string) {
  return fields.get(key)?.markdown.trim() ?? "";
}

function cmsItems(fields: Map<string, CmsField>, key: string) {
  return fields.get(key)?.items ?? [];
}

function extractContent(html: string) {
  const articleHtml = removeTagBlocks(removeElementById(html, "cms-fields"), "nav");
  return convertBlocksToMarkdown(articleHtml);
}

function extractSummary(html: string, content: string) {
  const cmsSummary = cmsText(extractCmsFields(html), "summary");
  if (cmsSummary) return cmsSummary.slice(0, 1_200);

  const metaDescription = extractMetaContent(html, "description");
  if (metaDescription) return metaDescription.slice(0, 1_200);

  const firstParagraph = stripTags(firstMatch(html, /<p\b[^>]*>([\s\S]*?)<\/p>/i));
  const summary = firstParagraph || content.split(/\r?\n/).find((line) => line.trim() && !line.startsWith("#"))?.trim() || "";
  if (!summary) throw new Error("HTML import requires a summary paragraph or meta description.");
  return summary.slice(0, 1_200);
}

export function extractAiNewsBatchVisibleContent(html: string) {
  const body = extractElementOuterHtmlById(html, "article-body");
  if (!body) throw new Error("V2 requires a visible article-body element.");
  return convertBlocksToMarkdown(stripWrappingTag(body), { skipFeaturedImage: false });
}

export function buildAiNewsImportPayloadFromHtml(input: AiNewsHtmlImportInput): AiNewsImportPayload {
  const html = input.html.trim().replace(/^\uFEFF/, "");
  if (!html) throw new Error("HTML import requires HTML content.");
  if (html.length > maxHtmlChars) throw new Error(`HTML import cannot exceed ${maxHtmlChars} characters.`);

  rejectUnsafeHtml(html);

  const publishMode = input.publishMode ?? "draft";
  const cmsFields = extractCmsFields(html, input.preferCmsArticleFields);
  const title = input.preferCmsArticleFields ? cmsText(cmsFields, "title") : extractTitle(html);
  const content = input.preferCmsArticleFields ? cmsMarkdown(cmsFields, "content") : extractContent(html);
  if (!title || !content) throw new Error("HTML import requires explicit title and content fields.");
  const summary = extractSummary(html, content);
  const metaKeywords = extractMetaContent(html, "keywords");
  const keywords = cmsText(cmsFields, "keywords") || (input.preferCmsArticleFields ? cmsText(cmsFields, "seoKeywords") : metaKeywords);
  const seoKeywords = cmsText(cmsFields, "seoKeywords") || keywords;
  const seoDescription = cmsText(cmsFields, "seoDescription") || extractMetaContent(html, "description");
  const englishKeywords = cmsText(cmsFields, "englishKeywords");
  const englishDescription = cmsText(cmsFields, "englishDescription");
  const englishSeoDescription = cmsText(cmsFields, "englishSeoDescription");
  const englishSeoKeywords = cmsText(cmsFields, "englishSeoKeywords") || englishKeywords;
  const tags = input.preferCmsArticleFields ? dedupeText([...cmsItems(cmsFields, "tags"), ...(input.tags ?? [])]) : extractTags(html, input.tags, cmsItems(cmsFields, "tags"));
  const externalSources = extractSources(html, publishMode);
  const publishedAt = extractPublishedAt(html, publishMode);
  const coverImage = extractCoverImage(html);

  return {
    publishMode,
    ...(publishedAt ? { publishedAt } : {}),
    ...(input.importBatchId?.trim() ? { importBatchId: input.importBatchId.trim() } : {}),
    article: {
      title,
      summary,
      content,
      author: "ENHE AI",
      ...(cmsText(cmsFields, "subtitle") ? { subtitle: cmsText(cmsFields, "subtitle") } : {}),
      ...(seoDescription ? { description: seoDescription } : {}),
      ...(keywords ? { keywords } : {}),
      ...(coverImage ? { coverImage } : {}),
      ...(cmsText(cmsFields, "videoUrl") ? { videoUrl: cmsText(cmsFields, "videoUrl") } : {}),
      ...(cmsText(cmsFields, "videoTitle") ? { videoTitle: cmsText(cmsFields, "videoTitle") } : {}),
      ...(cmsText(cmsFields, "videoDescription") ? { videoDescription: cmsText(cmsFields, "videoDescription") } : {}),
      ...(input.categoryName?.trim() ? { categoryName: input.categoryName.trim() } : {}),
      ...(input.categorySlug?.trim() ? { categorySlug: input.categorySlug.trim() } : {}),
      tags,
      ...(cmsText(cmsFields, "seoTitle") ? { seoTitle: cmsText(cmsFields, "seoTitle") } : {}),
      ...(seoDescription ? { seoDescription } : {}),
      ...(seoKeywords ? { seoKeywords } : {}),
      ...(cmsText(cmsFields, "canonicalUrl") || extractCanonicalUrl(html)
        ? { canonicalUrl: cmsText(cmsFields, "canonicalUrl") || extractCanonicalUrl(html) }
        : {}),
      keyTakeaways: cmsItems(cmsFields, "keyTakeaways"),
      ...(cmsText(cmsFields, "impactNotes") ? { impactNotes: cmsText(cmsFields, "impactNotes") } : {}),
      ...(cmsText(cmsFields, "conclusion") ? { conclusion: cmsText(cmsFields, "conclusion") } : {}),
      relatedArticleIds: cmsItems(cmsFields, "relatedArticleIds"),
      relatedToolIds: cmsItems(cmsFields, "relatedToolIds"),
      relatedTutorialIds: cmsItems(cmsFields, "relatedTutorialIds"),
      ...(cmsText(cmsFields, "englishTitle") ? { englishTitle: cmsText(cmsFields, "englishTitle") } : {}),
      ...(cmsText(cmsFields, "englishSubtitle") ? { englishSubtitle: cmsText(cmsFields, "englishSubtitle") } : {}),
      ...(englishDescription || englishSeoDescription ? { englishDescription: englishDescription || englishSeoDescription } : {}),
      ...(cmsText(cmsFields, "englishSummary") ? { englishSummary: cmsText(cmsFields, "englishSummary") } : {}),
      ...(cmsMarkdown(cmsFields, "englishContent") ? { englishContent: cmsMarkdown(cmsFields, "englishContent") } : {}),
      ...(englishKeywords ? { englishKeywords } : {}),
      ...(cmsText(cmsFields, "englishSeoTitle") ? { englishSeoTitle: cmsText(cmsFields, "englishSeoTitle") } : {}),
      ...(englishSeoDescription ? { englishSeoDescription } : {}),
      ...(englishSeoKeywords ? { englishSeoKeywords } : {}),
      englishKeyTakeaways: cmsItems(cmsFields, "englishKeyTakeaways"),
      ...(cmsText(cmsFields, "englishImpactNotes") ? { englishImpactNotes: cmsText(cmsFields, "englishImpactNotes") } : {}),
      ...(cmsText(cmsFields, "englishConclusion") ? { englishConclusion: cmsText(cmsFields, "englishConclusion") } : {}),
      externalSources
    }
  };
}
