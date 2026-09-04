export const virtualToolCategoryPrefix = "category-name:";

export type ToolCategoryOption = {
  id: string;
  name: string;
};

export const themedToolCategoryNames = {
  productivity: [
    "办公效率工具",
    "文件处理工具",
    "系统实用工具",
    "数据分析工具",
    "提升效率",
    "AI电脑软件",
  ],
  mediaGeneration: [
    "AI视频工具",
    "AI图片工具",
    "AI音频工具",
    "视频生成",
    "语音生成",
    "视频/图片处理",
  ],
  futureAi: [
    "AI 智能体",
    "生活实用AI工具",
    "智能体",
    "账号订购",
    "升级订阅",
    "AI 提示词",
    "AI 副业变现",
  ],
} as const;

export type ToolCategoryTheme = keyof typeof themedToolCategoryNames;

export function buildVirtualToolCategoryId(name: string) {
  return `${virtualToolCategoryPrefix}${encodeURIComponent(name)}`;
}

export function parseVirtualToolCategoryId(value: string | undefined) {
  if (!value?.startsWith(virtualToolCategoryPrefix)) return null;

  const encodedName = value.slice(virtualToolCategoryPrefix.length);
  try {
    return decodeURIComponent(encodedName);
  } catch {
    return null;
  }
}

export function buildThemedToolCategories(
  categories: ToolCategoryOption[],
  theme: ToolCategoryTheme,
) {
  const categoriesByName = new Map(
    categories.map((category) => [category.name, category]),
  );

  return themedToolCategoryNames[theme].map((name) => {
    return categoriesByName.get(name) ?? { id: buildVirtualToolCategoryId(name), name };
  });
}
