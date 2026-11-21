import { createHash } from "node:crypto";
import editorialOverrides from "./lib/ai-prompt-editorial-overrides.json";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Translation = {
  title: string;
  category: string;
  summary: string;
  prompt: string;
  tags: string[];
};

type SourceEntry = {
  id: string;
  title: string;
  category: string;
  summary: string;
  prompt: string;
  tags: string[];
  translations?: {
    en?: Translation;
  };
};

type SourceDataset = {
  stats: {
    total: number;
    generatedAt: string;
  };
  entries: SourceEntry[];
};

const englishCategoryByChinese: Record<string, string> = {
  编程: "Programming",
  红书: "Xiaohongshu",
  小红书: "Xiaohongshu",
  角色: "Roles",
  论文: "Academic Writing",
  生活: "Life",
  视频: "Video",
  图片: "Images",
  问答: "General",
  小说: "Fiction",
  写作: "Writing",
  运营: "Operations",
  职场: "Workplace",
};

function readSourceArgument() {
  const sourceIndex = process.argv.indexOf("--source");
  const source =
    sourceIndex >= 0 ? process.argv[sourceIndex + 1] : process.env.AI_PROMPT_SOURCE;
  if (!source) {
    throw new Error(
      "Missing --source. Pass the generated desktop prompts.json file.",
    );
  }
  return resolve(source);
}

function categories(entries: Array<{ category: string }>) {
  return Array.from(new Set(entries.map((entry) => entry.category))).sort((a, b) =>
    a.localeCompare(b),
  );
}

const sourcePath = readSourceArgument();
const source = JSON.parse(readFileSync(sourcePath, "utf8")) as SourceDataset;
if (source.stats.total !== source.entries.length) {
  throw new Error(
    `Source total ${source.stats.total} does not match ${source.entries.length} entries.`,
  );
}
const ids = new Set(source.entries.map((entry) => entry.id));
if (ids.size !== source.entries.length) {
  throw new Error("Source dataset contains duplicate prompt ids.");
}
const missingEnglish = source.entries.filter((entry) => !entry.translations?.en);
if (missingEnglish.length) {
  throw new Error(
    `Missing English translations for ${missingEnglish.length} prompt entries.`,
  );
}
const hanPattern = /\p{Script=Han}/u;
for (const entry of source.entries) {
  const english = entry.translations!.en!;
  const values = [
    english.title,
    english.category,
    english.summary,
    english.prompt,
    ...english.tags,
  ];
  if (values.some((value) => !value.trim())) {
    throw new Error(`Empty English field for prompt ${entry.id}.`);
  }
  if (values.some((value) => hanPattern.test(value))) {
    throw new Error(`Chinese text remains in English prompt ${entry.id}.`);
  }
}

// Preserve reviewed website edits when reimporting the same older desktop data.
type ReviewedField = { previousSha256: string; value: string | string[] };
type ReviewedFields = Partial<Record<keyof Translation, ReviewedField>>;
const reviewed: Record<string, { zh?: ReviewedFields; en?: ReviewedFields }> = editorialOverrides;
function applyReviewedFields(entry: Translation & { id: string }, locale: "zh" | "en") {
  const overrides = reviewed[entry.id]?.[locale];
  if (!overrides) return entry;
  const result = { ...entry };
  for (const [field, correction] of Object.entries(overrides)) {
    const key = field as keyof Translation;
    const digest = createHash("sha256").update(JSON.stringify(entry[key])).digest("hex");
    if (digest !== correction.previousSha256) continue;
    if (key === "tags" && Array.isArray(correction.value)) result.tags = correction.value;
    else if (key !== "tags" && typeof correction.value === "string") result[key] = correction.value;
  }
  return result;
}

const zhEntries = source.entries.map((entry) => applyReviewedFields({
  id: entry.id,
  category: entry.category,
  title: entry.title,
  summary: entry.summary,
  prompt: entry.prompt,
  tags: entry.tags,
}, "zh"));
const enEntries = source.entries.map((entry) => {
  const english = entry.translations!.en!;
  const category = englishCategoryByChinese[entry.category] ?? english.category;
  return applyReviewedFields({
    id: entry.id,
    category,
    title: english.title,
    summary: english.summary,
    prompt: english.prompt,
    tags: Array.from(
      new Set([category, ...english.tags.filter((tag) => tag !== english.category)]),
    ),
  }, "en");
});
const datasets = {
  zh: {
    generatedAt: source.stats.generatedAt,
    total: zhEntries.length,
    categories: categories(zhEntries),
    entries: zhEntries,
  },
  en: {
    generatedAt: source.stats.generatedAt,
    total: enEntries.length,
    categories: categories(enEntries),
    entries: enEntries,
  },
};

const publicRoot = join(
  process.cwd(),
  "public",
  "data",
  "ai-prompt-management",
);
mkdirSync(publicRoot, { recursive: true });
writeFileSync(
  join(publicRoot, "zh.json"),
  JSON.stringify(datasets.zh),
  "utf8",
);
writeFileSync(
  join(publicRoot, "en.json"),
  JSON.stringify(datasets.en),
  "utf8",
);

const manifestPath = join(
  process.cwd(),
  "src",
  "data",
  "ai-prompt-management-manifest.ts",
);
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(
  manifestPath,
  `export const aiPromptManagementManifest = ${JSON.stringify(
    {
      total: source.entries.length,
      generatedAt: source.stats.generatedAt,
      categories: {
        zh: datasets.zh.categories,
        en: datasets.en.categories,
      },
      paths: {
        zh: "/data/ai-prompt-management/zh.json",
        en: "/data/ai-prompt-management/en.json",
      },
    },
    null,
    2,
  )} as const;\n`,
  "utf8",
);

console.log(`Synchronized ${source.entries.length} prompts from ${sourcePath}`);
