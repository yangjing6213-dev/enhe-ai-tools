import type { Locale } from "@/lib/dictionaries";
import { buildSeoFriendlySlug } from "@/lib/admin-form";
import { resolveAiNewsCanonicalSlug } from "@/lib/ai-news";
import { buildLocalePath } from "@/lib/seo";

const explicitToolCanonicalSlugs: Record<string, string> = {
  zfb: "zfb-transfer-link-qr-code-generator",
  "ai-ai-ilo5a5": "ai-monetization-side-hustle-course",
};

const explicitAiNewsCanonicalSlugs: Record<string, string> = {
  "ai-2": "tencent-cloud-efficiency-agent-tools",
  "ai-3": "how-to-choose-ai-tool-website",
  "ai-7-2": "ai-7",
  "anolisa-ai-2": "anolisa-ai",
  "enhe-ai": "enhe-ai-tool-station-user-guide",
  "github-copilot-cli-ai-2": "github-copilot-cli-ai",
};

export function getCanonicalToolSlug(tool: {
  slug: string;
  name: string;
  englishName?: string | null;
}) {
  const explicitSlug = explicitToolCanonicalSlugs[tool.slug];
  if (explicitSlug) return explicitSlug;

  return buildSeoFriendlySlug({
    currentSlug: tool.slug,
    name: tool.name,
    englishName: tool.englishName
  });
}

export function buildCanonicalToolPath(
  tool: {
    slug: string;
    name: string;
    englishName?: string | null;
    type?: "software" | "online" | "skill_learning";
  },
  locale: Locale
) {
  return buildLocalePath(`${getCanonicalToolBasePath(tool)}/${getCanonicalToolSlug(tool)}`, locale);
}

export function getCanonicalToolBasePath(tool: { type?: "software" | "online" | "skill_learning" }) {
  if (tool.type === "online") return "/account-services";
  if (tool.type === "skill_learning") return "/skill-learning";
  return "/software";
}

export function getCanonicalAiNewsSlug(article: {
  slug: string;
  title: string;
  englishTitle?: string | null;
}) {
  const explicitSlug = explicitAiNewsCanonicalSlugs[article.slug];
  if (explicitSlug) return explicitSlug;

  return resolveAiNewsCanonicalSlug({
    slug: article.slug,
    title: article.title,
    englishTitle: article.englishTitle
  });
}

export function buildCanonicalAiNewsPath(
  article: {
    slug: string;
    title: string;
    englishTitle?: string | null;
  },
  locale: Locale
) {
  return buildLocalePath(`/ai-news/${getCanonicalAiNewsSlug(article)}`, locale);
}
