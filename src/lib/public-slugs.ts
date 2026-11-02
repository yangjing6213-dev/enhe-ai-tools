import type { Locale } from "@/lib/dictionaries";
import { buildSeoFriendlySlug } from "@/lib/admin-form";
import { resolveAiNewsCanonicalSlug } from "@/lib/ai-news";
import { buildLocalePath } from "@/lib/seo";

const explicitToolCanonicalSlugs: Record<string, string> = {
  zfb: "zfb-transfer-link-qr-code-generator",
  "ai-ai-ilo5a5": "ai-monetization-side-hustle-course",
  "tool-mq12l5w6": "no-code-chat-screenshot-maker",
  "ai-skill": "intentbridge",
  "ai-prompt": "ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation",
  "ai-ai": "local-ai-voice-generator-for-voiceover-materials",
  "ai-codex": "product-video",
  "ai-video-studio-ai-ai-video-studio-ai": "ultimate-edition-ai-video-generation-suite",
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
    type?: "software" | "online" | "skill_learning" | "ai_skill" | "ai_workflow";
  },
  locale: Locale
) {
  return buildLocalePath(`${getCanonicalToolBasePath(tool)}/${getCanonicalToolSlug(tool)}`, locale);
}

export function getCanonicalToolBasePath(tool: { type?: "software" | "online" | "skill_learning" | "ai_skill" | "ai_workflow" }) {
  if (tool.type === "online") return "/account-services";
  if (tool.type === "skill_learning") return "/skill-learning";
  if (tool.type === "ai_skill") return "/ai-skills";
  if (tool.type === "ai_workflow") return "/ai-workflows";
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
