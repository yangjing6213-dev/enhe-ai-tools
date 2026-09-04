import type { Locale } from "@/lib/i18n";

export type DevelopmentItemStatus = "completed" | "partial" | "not_started" | "recommended";

export type DevelopmentProgressItem = {
  id?: string;
  module: string;
  sortOrder: number;
};

export const statusMeta: Record<DevelopmentItemStatus, { label: string; weight: number; className: string }> = {
  completed: {
    label: "已完成",
    weight: 1,
    className: "border-[var(--marketing-accent)]/35 bg-[var(--marketing-accent)]/12 text-[#ffd8cc]"
  },
  partial: {
    label: "部分完成",
    weight: 0.5,
    className: "border-[#FFB86B]/30 bg-[#FFB86B]/10 text-[#FFB86B]"
  },
  not_started: {
    label: "未开始",
    weight: 0,
    className: "border-white/10 bg-white/5 text-[#8B95A7]"
  },
  recommended: {
    label: "建议补强",
    weight: 0,
    className: "border-[#FFB86B]/30 bg-[#FFB86B]/10 text-[#FFB86B]"
  }
};

const statusMetaEn: Record<DevelopmentItemStatus, { label: string; weight: number; className: string }> = {
  completed: {
    label: "Completed",
    weight: 1,
    className: statusMeta.completed.className
  },
  partial: {
    label: "Partially complete",
    weight: 0.5,
    className: statusMeta.partial.className
  },
  not_started: {
    label: "Not started",
    weight: 0,
    className: statusMeta.not_started.className
  },
  recommended: {
    label: "Recommended",
    weight: 0,
    className: statusMeta.recommended.className
  }
};

export const priorityMeta = {
  high: { label: "高优先级", className: "text-red-200" },
  medium: { label: "中优先级", className: "text-[#FFB86B]" },
  low: { label: "低优先级", className: "text-[#8B95A7]" }
} as const;

const priorityMetaEn = {
  high: { label: "High priority", className: priorityMeta.high.className },
  medium: { label: "Medium priority", className: priorityMeta.medium.className },
  low: { label: "Low priority", className: priorityMeta.low.className }
} as const;

export const versionStatusMeta = {
  active: "开发中",
  planned: "规划中",
  released: "已发布",
  archived: "已归档"
} as const;

const versionStatusMetaEn = {
  active: "In development",
  planned: "Planned",
  released: "Released",
  archived: "Archived"
} as const;

export function getDevelopmentStatusMeta(locale: Locale) {
  return locale === "en" ? statusMetaEn : statusMeta;
}

export function getDevelopmentPriorityMeta(locale: Locale) {
  return locale === "en" ? priorityMetaEn : priorityMeta;
}

export function getDevelopmentVersionStatusMeta(locale: Locale) {
  return locale === "en" ? versionStatusMetaEn : versionStatusMeta;
}

export function calculateDevelopmentSummary(items: { status: DevelopmentItemStatus }[]) {
  const total = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const partial = items.filter((item) => item.status === "partial").length;
  const recommended = items.filter((item) => item.status === "recommended").length;
  const notStarted = items.filter((item) => item.status === "not_started").length;
  const weighted = items.reduce((sum, item) => sum + statusMeta[item.status].weight, 0);

  return {
    total,
    completed,
    partial,
    recommended,
    notStarted,
    completionPercent: total ? Math.round((weighted / total) * 100) : 0
  };
}

export function groupDevelopmentItemsByModule<T extends DevelopmentProgressItem>(items: T[]) {
  const moduleOrder = new Map<string, number>();
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    if (!moduleOrder.has(item.module)) moduleOrder.set(item.module, moduleOrder.size);
    grouped.set(item.module, [...(grouped.get(item.module) ?? []), item]);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => (moduleOrder.get(left) ?? 0) - (moduleOrder.get(right) ?? 0))
    .map(([module, moduleItems]) => ({
      module,
      items: [...moduleItems].sort((left, right) => left.sortOrder - right.sortOrder)
    }));
}
