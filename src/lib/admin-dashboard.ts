export type PopularToolInput = {
  name: string;
  downloadCount: number;
  usageCount: number;
};

export type RankedPopularTool = PopularToolInput & {
  score: number;
};

export function calculateGrowthPercent(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatDashboardAmount(value: string | number | null | undefined) {
  return `CNY ${Number(value ?? 0).toFixed(2)}`;
}

export function calculateRatePercent(part: number, total: number) {
  if (total <= 0 || part <= 0) return 0;
  return Math.round((part / total) * 100);
}

export type DailyTrendInput = {
  date: Date;
  amount: number;
  count: number;
};

export type DailyTrendBucket = {
  date: string;
  amount: number;
  count: number;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildDailyTrendBuckets(startDate: Date, days: number, rows: DailyTrendInput[]): DailyTrendBucket[] {
  const byDate = new Map<string, DailyTrendBucket>();
  for (const row of rows) {
    const key = toDateKey(row.date);
    const current = byDate.get(key) ?? { date: key, amount: 0, count: 0 };
    current.amount = Math.round((current.amount + row.amount) * 100) / 100;
    current.count += row.count;
    byDate.set(key, current);
  }

  return Array.from({ length: Math.max(0, days) }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + index);
    const key = toDateKey(date);
    return byDate.get(key) ?? { date: key, amount: 0, count: 0 };
  });
}

export function rankPopularTools<T extends PopularToolInput>(tools: T[]): (T & RankedPopularTool)[] {
  return tools
    .map((tool) => ({
      ...tool,
      score: tool.downloadCount + tool.usageCount
    }))
    .sort((left, right) => right.score - left.score || right.downloadCount - left.downloadCount || left.name.localeCompare(right.name));
}
