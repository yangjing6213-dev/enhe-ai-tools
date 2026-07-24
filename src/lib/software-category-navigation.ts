import type { Locale } from "@/lib/dictionaries";
import { buildLocalePath } from "@/lib/seo";
import { resolveLocalizedToolCategoryName } from "@/lib/tool-localization";

export const softwareNavCategories = [
  {
    name: "视频生成",
    label: { zh: "视频生成", en: "Video generation" },
    description: {
      zh: "视频创作与生成工具",
      en: "Video creation and generation tools",
    },
    aliases: ["AI视频生成", "video generation", "ai video generation"],
  },
  {
    name: "语音生成",
    label: { zh: "语音生成", en: "Voice generation" },
    description: {
      zh: "语音、旁白与音频生成",
      en: "Voice, narration, and audio generation",
    },
    aliases: ["AI语音生成", "音频生成", "voice generation", "audio generation", "ai voice generation"],
  },
  {
    name: "智能体",
    label: { zh: "智能体", en: "Agents" },
    description: {
      zh: "智能体工具与自动化流程",
      en: "Agent tools and workflow automation",
    },
    aliases: ["AI智能体", "agent", "agents", "ai agent", "ai agents"],
  },
  {
    name: "视频/图片处理",
    label: { zh: "视频/图片处理", en: "Video/image processing" },
    description: {
      zh: "视频图片编辑、增强与修复",
      en: "Media editing, enhancement, and repair",
    },
    aliases: [
      "AI视频/图片处理",
      "AI视频图片处理",
      "图片处理",
      "视频处理",
      "video image processing",
      "video/image processing",
      "media processing",
    ],
  },
  {
    name: "提升效率",
    label: { zh: "提升效率", en: "Productivity" },
    description: {
      zh: "提升日常工作效率的工具",
      en: "Tools for daily work and productivity",
    },
    aliases: ["AI提升效率", "效率工具", "productivity", "ai productivity"],
  },
] as const;

function normalizeCategoryValue(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^ai\s*/i, "")
    .replace(/^ai/i, "")
    .replace(/[\/\\|&+_\-\s]/g, "")
    .trim();
}

export function buildSoftwareCategoryHref(categoryName: string, locale: Locale) {
  if (categoryName === "提升效率") {
    return buildLocalePath("/product-paths/work-efficiency", locale);
  }

  return buildLocalePath(
    `/software?categoryName=${encodeURIComponent(categoryName)}`,
    locale,
  );
}

export function resolveSoftwareCategoryIdByName(
  requestedName: string | null | undefined,
  categories: { id: string; name: string }[],
  locale: Locale,
) {
  const requested = normalizeCategoryValue(requestedName);
  if (!requested) return undefined;

  const navCategory = softwareNavCategories.find((category) =>
    [category.name, category.label.zh, category.label.en, ...category.aliases]
      .map(normalizeCategoryValue)
      .includes(requested),
  );
  const acceptedNames = new Set(
    (navCategory
      ? [navCategory.name, categoryLabel(navCategory, locale), ...navCategory.aliases]
      : [requestedName ?? ""])
      .map(normalizeCategoryValue),
  );

  return categories.find((category) => {
    const localizedName = resolveLocalizedToolCategoryName(
      category.name,
      "software",
      locale,
    );
    return acceptedNames.has(normalizeCategoryValue(category.name)) ||
      acceptedNames.has(normalizeCategoryValue(localizedName));
  })?.id;
}

function categoryLabel(
  category: (typeof softwareNavCategories)[number],
  locale: Locale,
) {
  return category.label[locale];
}
