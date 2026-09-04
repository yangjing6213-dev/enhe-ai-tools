export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const genericSlugTokens = new Set(["ai", "tool", "tools", "news", "app", "service", "course"]);

export function isWeakSeoSlug(value: string) {
  const normalized = slugify(value);
  if (!normalized) return true;
  if (/^(tool|news|ai-news)-[a-z0-9-]{2,}$/i.test(normalized)) return true;
  if (/^(ai|app|tool|news)-[a-z0-9]{5,10}$/i.test(normalized)) return true;

  const tokens = normalized.split("-").filter(Boolean);
  if (!tokens.length) return true;

  const uniqueTokens = new Set(tokens);
  const genericTokenCount = tokens.filter((token) => genericSlugTokens.has(token)).length;

  if (uniqueTokens.size === 1 && tokens.length > 1) return true;
  if (genericTokenCount === tokens.length) return true;
  if (tokens.length >= 4 && uniqueTokens.size <= Math.ceil(tokens.length / 2)) return true;

  return false;
}

export function buildSeoFriendlySlug({
  currentSlug,
  name,
  englishName
}: {
  currentSlug: string;
  name: string;
  englishName?: string | null;
}) {
  const normalizedCurrentSlug = slugify(currentSlug);
  const englishSlug = slugify(englishName ?? "");
  const nameSlug = slugify(name);

  if (!isWeakSeoSlug(normalizedCurrentSlug)) {
    return normalizedCurrentSlug;
  }

  if (englishSlug && englishSlug !== normalizedCurrentSlug) {
    return englishSlug;
  }

  if (nameSlug && nameSlug !== normalizedCurrentSlug) {
    return nameSlug;
  }

  return normalizedCurrentSlug;
}

export function resolveToolSlug({
  name,
  slugInput,
  fallbackSeed
}: {
  name: string;
  slugInput?: string | null;
  fallbackSeed: string;
}) {
  const manualSlug = slugInput ? slugify(slugInput) : "";
  if (manualSlug) return manualSlug;

  const nameSlug = slugify(name);
  if (nameSlug) return nameSlug;

  return `tool-${slugify(fallbackSeed) || "item"}`;
}

export function parseBooleanField(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export function parseNumberField(value: FormDataEntryValue | null, fallback = 0) {
  if (value === null || String(value).trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseOptionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export function parseScreenshotsField(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildPublicUploadUrl(fileName: string, now = Date.now()) {
  const safeName = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `/uploads/${now}-${safeName || "file"}`;
}
