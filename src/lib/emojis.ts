export type EmojiEntry = {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  order: number;
};

export const emojiCatalogKey = "managed_emoji_catalog";
export const maxEmojiEntries = 200;
export const maxEmojiUploadBytes = 4 * 1024 * 1024;
export class EmojiCatalogError extends Error {}

const labels = [
  "出发", "挥手", "摸鱼", "停一下", "喝咖啡", "惊讶", "躺平", "冲呀", "耶", "委屈",
  "小伙伴", "摄影师", "滑板星星", "恐龙", "宇航员", "江湖高手", "永远年轻", "滑板少年",
  "星星冰淇淋", "通行证", "好运", "你好", "探索者来了", "欢迎", "青春万岁", "666"
];

export const defaultEmojis: EmojiEntry[] = labels.map((label, index) => {
  const id = `enhe_${String(index + 1).padStart(2, "0")}`;
  return { id, label, url: `/images/emojis/${id}-transparent.webp`, enabled: true, order: index };
});

const defaultEmojiById = new Map(defaultEmojis.map((entry) => [entry.id, entry]));

export function isSafeEmojiUrl(value: string) {
  if (/^\/images\/emojis\/enhe_[a-z0-9_-]+\.png$/.test(value)) return true;
  if (/^\/(?:images\/emojis|uploads\/emojis)\/[a-z0-9_-]+\.webp$/.test(value)) return true;
  if (/^\/uploads\/[0-9]+-emojis-[0-9]+-enhe-[a-z0-9]{2,32}\.webp$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.search && !url.hash
      && /^[a-z0-9-]+\.cos\.[a-z0-9-]+\.(?:myqcloud\.com|tencentcos\.cn)$/.test(url.hostname)
      && /^\/emojis\/[a-z0-9_-]+\.webp$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function emojiImageSource(entry: Pick<EmojiEntry, "id" | "url">) {
  return (entry.url.startsWith("https://") || entry.url.startsWith("/uploads/")) && isSafeEmojiUrl(entry.url)
    ? `/api/emojis/${encodeURIComponent(entry.id)}` : entry.url;
}

function isEmojiEntry(value: unknown): value is EmojiEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === "string" && /^enhe_[a-z0-9]{2,32}$/.test(entry.id)
    && typeof entry.label === "string" && Boolean(entry.label.trim()) && entry.label.length <= 40
    && typeof entry.url === "string" && isSafeEmojiUrl(entry.url)
    && typeof entry.enabled === "boolean" && Number.isInteger(entry.order)
    && Number(entry.order) >= 0 && Number(entry.order) <= 10000;
}

export function sortEmojis(entries: readonly EmojiEntry[]) {
  return [...entries].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function parseEmojiCatalog(raw?: string | null): EmojiEntry[] {
  if (!raw || raw.length > 128 * 1024) return defaultEmojis;
  try {
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries) || entries.length > maxEmojiEntries || !entries.every(isEmojiEntry)
      || new Set(entries.map((entry) => entry.id)).size !== entries.length) return defaultEmojis;
    const savedEntries = entries.map((entry) => {
      const fallback = defaultEmojiById.get(entry.id);
      const previousBuiltInUrl = `/images/emojis/${entry.id}.${entry.id === "enhe_13" ? "png" : "webp"}`;
      return fallback && entry.url === previousBuiltInUrl ? { ...entry, url: fallback.url } : entry;
    });
    const ids = new Set(savedEntries.map((entry) => entry.id));
    const merged = [...savedEntries, ...defaultEmojis.filter((entry) => !ids.has(entry.id))];
    return merged.length <= maxEmojiEntries ? sortEmojis(merged) : defaultEmojis;
  } catch {
    return defaultEmojis;
  }
}

export function validateEmojiEdits(value: unknown, current: readonly EmojiEntry[]): EmojiEntry[] {
  if (!Array.isArray(value) || value.length !== current.length || value.length > maxEmojiEntries) {
    throw new EmojiCatalogError("表情目录已变化，请刷新后重试。移除素材请使用停用，保留历史内容。");
  }
  const seen = new Set<string>();
  const byId = new Map(current.map((entry) => [entry.id, entry]));
  return sortEmojis(value.map((edit: unknown) => {
    if (!edit || typeof edit !== "object") throw new EmojiCatalogError("表情信息不完整。");
    const item = edit as Record<string, unknown>;
    const existing = typeof item.id === "string" ? byId.get(item.id) : undefined;
    if (!existing || seen.has(existing.id)) throw new EmojiCatalogError("表情编号无效，请刷新后重试。");
    seen.add(existing.id);
    const updated = { ...existing, label: typeof item.label === "string" ? item.label.trim() : "", enabled: item.enabled, order: item.order };
    if (!isEmojiEntry(updated)) throw new EmojiCatalogError("名称请填写 1–40 个字，排序请填写 0–10000 的整数。");
    return updated;
  }));
}

export type EmojiTextPart = { text: string; emoji?: never } | { emoji: EmojiEntry; text?: never };

export function splitEmojiText(text: string, entries: readonly EmojiEntry[]): EmojiTextPart[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const parts: EmojiTextPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/:enhe_[a-z0-9]{2,32}:/g)) {
    const emoji = byId.get(match[0].slice(1, -1));
    if (!emoji) continue;
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index) });
    parts.push({ emoji });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length || !parts.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
