import { z } from "zod";

const staticImageHosts = new Set([
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
  "opengraph.githubassets.com",
  "static.enhe-tech.com.cn",
  "enhe-static-1303691623.cos.ap-shanghai.myqcloud.com",
]);
const generatedCoverPath = /^\/api\/ai-workflows\/covers\/ai-workflow-(?:\d{1,32}-[a-z0-9-]+|[a-z0-9-]+-\d{1,32}-[a-f0-9]{12})$/;

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

function isGeneratedCoverUrl(value: string) {
  if (generatedCoverPath.test(value)) return true;
  const url = safeHttpsUrl(value);
  return Boolean(url && ["www.enhe-tech.com.cn", "enhe-tech.com.cn"].includes(url.hostname) && generatedCoverPath.test(url.pathname));
}

function isRepositoryCoverUrl(value: string) {
  const url = safeHttpsUrl(value);
  return Boolean(url && (
    staticImageHosts.has(url.hostname) ||
    (url.hostname === "github.com" && /^\/user-attachments\/assets\/[A-Za-z0-9-]+$/.test(url.pathname))
  ));
}

function isCoverSourceUrl(value: string) {
  const url = safeHttpsUrl(value);
  return Boolean(url && (isRepositoryCoverUrl(value) || (url.hostname === "github.com" && /^\/[^/]+\/[^/]+(?:\/|$)/.test(url.pathname))));
}

const localizedText = (maximum: number) => z.string().trim().min(1).max(maximum)
  .refine((value) => !/\[\[\/?(?:zh|en)\]\]/i.test(value), "Language blocks must be provided as separate fields.")
  .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), "Control characters are not allowed.")
  .refine((value) => !/<[^>]*>|!\[|\]\(/i.test(value), "Embedded HTML, images and links are not allowed.")
  .refine((value) => !/-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{32,})\b|(?:api[_-]?key|secret|password|token|authorization)\s*[:=]\s*\S+/i.test(value), "Credentials are not allowed.");

const localizedPresentationSchema = z.object({
  name: localizedText(120),
  shortDescription: localizedText(300),
  content: localizedText(14000),
}).strict();

export const aiWorkflowPresentationSchema = z.object({
  zh: localizedPresentationSchema,
  en: localizedPresentationSchema,
  cover: z.object({
    url: z.string().trim().min(1).max(1200),
    source: z.enum(["repository", "generated"]),
    sourceUrl: z.string().trim().max(1200).refine(isCoverSourceUrl).optional(),
  }).strict().refine((cover) => cover.source === "generated" ? isGeneratedCoverUrl(cover.url) : isRepositoryCoverUrl(cover.url), "The cover must use an approved image origin or the local generated route."),
}).strict().refine((value) =>
  /[\u3400-\u9fff]/.test(value.zh.shortDescription) && /[\u3400-\u9fff]/.test(value.zh.content) &&
  /[a-z]/i.test(value.en.shortDescription) && /[a-z]/i.test(value.en.content) && !/[\u3400-\u9fff]/.test(value.en.shortDescription + value.en.content),
  "Descriptions and content must match the requested language.",
);

export type AiWorkflowPresentation = z.infer<typeof aiWorkflowPresentationSchema>;

export function buildAiWorkflowGeneratedCoverUrl(repositoryId: string, repositoryName: string) {
  const name = repositoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "workflow";
  return `/api/ai-workflows/covers/ai-workflow-${repositoryId}-${name}`;
}

export function buildAiWorkflowPresentationFields(presentation: AiWorkflowPresentation) {
  const bilingual = (zh: string, en: string) => `[[zh]]${zh}[[/zh]]\n[[en]]${en}[[/en]]`;
  return {
    name: presentation.zh.name,
    englishName: presentation.en.name,
    shortDescription: bilingual(presentation.zh.shortDescription, presentation.en.shortDescription),
    content: bilingual(presentation.zh.content, presentation.en.content),
    coverImage: presentation.cover.url,
  };
}
