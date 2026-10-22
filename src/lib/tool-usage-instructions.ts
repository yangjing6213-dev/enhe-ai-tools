export type ToolUsageStep = { title: string; description: string };

const MAX_USAGE_STEPS = 5;
export const MAX_USAGE_PROMPT_LENGTH = 30000;
const RELEASE_VERSION_COMPONENT_PATTERN = /^(0|[1-9]\d?)$/;

export function parseToolUsageStepsJson(value: string): ToolUsageStep[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("使用步骤内容格式无效，请重新填写。");
  }

  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_USAGE_STEPS) {
    throw new Error("如何使用模式需要设置 1 到 5 个步骤。");
  }

  return parsed.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`第 ${index + 1} 个步骤内容无效。`);
    }

    const step = value as Record<string, unknown>;
    const title = typeof step.title === "string" ? step.title.trim() : "";
    const description = typeof step.description === "string" ? step.description.trim() : "";
    if (!title || !description || title.length > 120 || description.length > 1200) {
      throw new Error(`请填写第 ${index + 1} 个步骤的标题和说明。`);
    }

    return { title, description };
  });
}

export function normalizeToolUsageSteps(value: unknown): ToolUsageStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      title: typeof item.title === "string" ? item.title.trim() : "",
      description: typeof item.description === "string" ? item.description.trim() : "",
    }))
    .filter((item) => item.title && item.description && item.title.length <= 120 && item.description.length <= 1200)
    .slice(0, MAX_USAGE_STEPS);
}

export function composeToolChangelogVersion(majorValue: string, minorValue: string) {
  if (!RELEASE_VERSION_COMPONENT_PATTERN.test(majorValue) || !RELEASE_VERSION_COMPONENT_PATTERN.test(minorValue)) {
    throw new Error("请选择有效的主版本号和次版本号。");
  }

  return `V${majorValue}.${minorValue}`;
}

export function parseToolChangelogVersion(value: string | null | undefined) {
  const match = value?.trim().match(/^v?(\d{1,2})\.(\d{1,2})$/i);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (major > 99 || minor > 99) return null;

  return { major, minor };
}
