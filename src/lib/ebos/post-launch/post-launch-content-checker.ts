import type {
  EbosPostLaunchCheckItem,
  EbosPostLaunchContentCheckResult
} from "./post-launch-types";

export function checkValidationPageContent(html: string, route: string): EbosPostLaunchContentCheckResult {
  const contentChecks = [
    checkNonEmptyHtml(html),
    checkNoNextErrorPage(html),
    checkNo404Fallback(html),
    checkHeroContent(html, route)
  ];
  const metadataChecks = checkMetadata(html);
  const ctaChecks = checkCtaContent(html);
  const faqChecks = checkFaqContent(html);
  const complianceChecks = checkComplianceNotice(html);
  const allChecks = [
    ...contentChecks,
    ...metadataChecks,
    ...ctaChecks,
    ...faqChecks,
    ...complianceChecks
  ];
  const blockers = allChecks
    .filter((item) => item.status === "fail")
    .map((item) => `${route}: ${item.title} failed (${item.actual})`);
  const warnings = allChecks
    .filter((item) => item.status === "warning")
    .map((item) => `${route}: ${item.title} warning (${item.actual})`);

  return {
    contentChecks,
    metadataChecks,
    ctaChecks,
    faqChecks,
    complianceChecks,
    warnings,
    blockers
  };
}

export function checkHeroContent(html: string, route = ""): EbosPostLaunchCheckItem {
  const visible = toSearchableText(html);
  const isEnglishRoute = route.startsWith("/en/");
  const patterns = isEnglishRoute
    ? [/AI Prompt Kit/i, /Prompt Kit/i]
    : [/AI Prompt Kit/i, /AI\s*提示词/i, /提示词工具包/i];
  const matched = patterns.some((pattern) => pattern.test(visible));
  return item({
    id: "hero-content",
    title: "Hero/title content",
    status: matched ? "pass" : "fail",
    expected: "Hero or page title mentions AI Prompt Kit or the localized product title.",
    actual: matched ? "Expected title signal found." : "Expected title signal was not found.",
    evidence: extractEvidence(visible, [/AI Prompt Kit/i, /Prompt Kit/i, /提示词/i])
  });
}

export function checkCtaContent(html: string): EbosPostLaunchCheckItem[] {
  const visible = toSearchableText(html);
  const matched = /CTA|Contact|Buy|Purchase|Start|咨询|购买|联系|开始|validation_ai_prompt_kit_cta_click|mailto:/i.test(html)
    || /Contact|Buy|Purchase|Start|咨询|购买|联系|开始/i.test(visible);
  return [
    item({
      id: "cta-present",
      title: "CTA present",
      status: matched ? "pass" : "fail",
      expected: "The page includes a visible CTA or CTA tracking marker.",
      actual: matched ? "CTA signal found." : "CTA signal was not found.",
      evidence: extractEvidence(visible, [/Contact/i, /Buy/i, /Purchase/i, /Start/i, /咨询/i, /购买/i, /联系/i, /开始/i])
    })
  ];
}

export function checkFaqContent(html: string): EbosPostLaunchCheckItem[] {
  const visible = toSearchableText(html);
  const matched = /FAQ|Frequently Asked|常见问题|常见问答|问答/i.test(visible);
  return [
    item({
      id: "faq-present",
      title: "FAQ present",
      status: matched ? "pass" : "fail",
      expected: "The page includes FAQ content.",
      actual: matched ? "FAQ signal found." : "FAQ signal was not found.",
      evidence: extractEvidence(visible, [/FAQ/i, /Frequently Asked/i, /常见问题/i, /问答/i])
    })
  ];
}

export function checkComplianceNotice(html: string): EbosPostLaunchCheckItem[] {
  const visible = toSearchableText(html);
  const matched = /Compliance|Disclaimer|compliance notice|合规|免责声明|风险提示|仅供|not legal|not financial/i.test(visible);
  return [
    item({
      id: "compliance-notice",
      title: "Compliance notice",
      status: matched ? "pass" : "fail",
      expected: "The page includes a compliance notice or disclaimer.",
      actual: matched ? "Compliance/disclaimer signal found." : "Compliance/disclaimer signal was not found.",
      evidence: extractEvidence(visible, [/Compliance/i, /Disclaimer/i, /合规/i, /免责声明/i, /风险提示/i])
    })
  ];
}

export function checkMetadata(html: string): EbosPostLaunchCheckItem[] {
  const title = readTitle(html);
  const description = readMetaDescription(html);
  return [
    item({
      id: "metadata-title",
      title: "Metadata title",
      status: title ? "pass" : "fail",
      expected: "HTML includes a non-empty <title>.",
      actual: title ? "Title found." : "Title missing.",
      evidence: title ?? ""
    }),
    item({
      id: "metadata-description",
      title: "Metadata description",
      status: description ? "pass" : "fail",
      expected: "HTML includes a non-empty meta description.",
      actual: description ? "Description found." : "Description missing.",
      evidence: description ?? ""
    })
  ];
}

function checkNonEmptyHtml(html: string): EbosPostLaunchCheckItem {
  const trimmed = html.trim();
  const passed = trimmed.length >= 500 && /<html[\s>]/i.test(trimmed);
  return item({
    id: "non-empty-html",
    title: "Non-empty HTML",
    status: passed ? "pass" : "fail",
    expected: "HTML document is present and not empty.",
    actual: passed ? `${trimmed.length} characters.` : `${trimmed.length} characters or missing <html>.`,
    evidence: trimmed.slice(0, 160)
  });
}

function checkNoNextErrorPage(html: string): EbosPostLaunchCheckItem {
  const visible = toSearchableText(html);
  const failed = /Application error|An error occurred in the Server Components render|NEXT_REDIRECT|NEXT_NOT_FOUND/i.test(visible);
  return item({
    id: "not-next-error-page",
    title: "Not a Next.js error page",
    status: failed ? "fail" : "pass",
    expected: "The route does not render a Next.js error page.",
    actual: failed ? "Next.js error signal found." : "No Next.js error signal found.",
    evidence: extractEvidence(visible, [/Application error/i, /Server Components/i, /NEXT_NOT_FOUND/i])
  });
}

function checkNo404Fallback(html: string): EbosPostLaunchCheckItem {
  const visible = toSearchableText(html);
  const failed = /This page could not be found|404\s*[:|-]?\s*not found|页面不存在|未找到页面/i.test(visible);
  return item({
    id: "not-404-fallback",
    title: "Not a 404 fallback",
    status: failed ? "fail" : "pass",
    expected: "The route does not render a 404 fallback page.",
    actual: failed ? "404 fallback signal found." : "No 404 fallback signal found.",
    evidence: extractEvidence(visible, [/This page could not be found/i, /404/i, /页面不存在/i, /未找到/i])
  });
}

function item(input: EbosPostLaunchCheckItem): EbosPostLaunchCheckItem {
  return input;
}

function readTitle(html: string) {
  return clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
}

function readMetaDescription(html: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = metaTags.find((entry) => /(?:name|property)=["'](?:description|og:description|twitter:description)["']/i.test(entry));
  if (!tag) return null;
  return clean(tag.match(/\bcontent=["']([^"']+)["']/i)?.[1]);
}

function clean(value: string | undefined) {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed ? decodeHtml(trimmed) : null;
}

function toSearchableText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function extractEvidence(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match?.index && match?.index !== 0) continue;
    const start = Math.max(0, match.index - 80);
    const end = Math.min(text.length, match.index + 140);
    return text.slice(start, end);
  }
  return "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
