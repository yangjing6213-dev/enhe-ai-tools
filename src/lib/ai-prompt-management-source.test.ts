import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  filterAiPromptManagementPrompts,
  type AiPromptManagementDataset,
  type AiPromptManagementPrompt,
} from "@/lib/ai-prompt-management";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function readJson<T>(path: string) {
  return JSON.parse(read(path)) as T;
}

const fixtures: AiPromptManagementPrompt[] = [
  {
    id: "writing",
    category: "写作",
    title: "自然文案",
    summary: "减少模板感",
    prompt: "请把文章改得更自然。",
    tags: ["文案", "润色"],
  },
  {
    id: "image",
    category: "图片",
    title: "产品封面",
    summary: "生成极简产品图",
    prompt: "请生成干净的产品封面。",
    tags: ["封面"],
  },
];

describe("AI prompt management website source contract", () => {
  it("filters the complete local dataset without coupling search to selection", () => {
    expect(
      filterAiPromptManagementPrompts(fixtures, {
        query: "自然",
        category: "全部",
        allLabel: "全部",
      }),
    ).toEqual([fixtures[0]]);
    expect(
      filterAiPromptManagementPrompts(fixtures, {
        query: "",
        category: "图片",
        allLabel: "全部",
      }),
    ).toEqual([fixtures[1]]);
  });

  it("adds bilingual public routes under skill learning", () => {
    expect(
      existsSync(
        join(
          root,
          "src/app/(zh-public)/skill-learning/ai-prompt-management/page.tsx",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(root, "src/app/en/skill-learning/ai-prompt-management/page.tsx"),
      ),
    ).toBe(true);
  });

  it("keeps prompt selection independent from search and category filters", () => {
    const component = read("src/components/ai-prompt-management-workbench.tsx");

    expect(component).toContain('useState("")');
    expect(component).toContain("setSelectedId(prompt.id)");
    expect(component).not.toContain("setQuery(title)");
    expect(component).not.toContain("setCategory(categoryLabel)");
    expect(component).toContain("aria-pressed={category === item}");
    expect(component).toContain("aria-pressed={selected?.id === prompt.id}");
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain("tabIndex={0}");
  });

  it("places the prompt manager below Build Your Own X in the skill-learning dropdown", () => {
    const header = read("src/components/site-header.tsx");
    const buildIndex = header.indexOf("Build Your Own X Navigator");
    const promptIndex = header.indexOf("AI Prompt Management System");

    expect(buildIndex).toBeGreaterThan(-1);
    expect(promptIndex).toBeGreaterThan(buildIndex);
    expect(header).toContain('"/skill-learning/ai-prompt-management"');
  });

  it("publishes bilingual data files and lists the routes for discovery", () => {
    expect(
      existsSync(join(root, "public/data/ai-prompt-management/zh.json")),
    ).toBe(true);
    expect(
      existsSync(join(root, "public/data/ai-prompt-management/en.json")),
    ).toBe(true);

    const sitemap = read("src/app/sitemap.ts");
    const discovery = read("src/lib/public-discovery-manifest.ts");
    const llms = read("public/llms.txt");
    expect(sitemap).toContain("publicDiscoveryRoutes");
    expect(discovery).toContain('path: "/skill-learning/ai-prompt-management"');
    expect(discovery).toContain('path: "/en/skill-learning/ai-prompt-management"');
    expect(llms).toContain("/skill-learning/ai-prompt-management");
  });

  it("publishes matching complete Chinese and English datasets", () => {
    const chinese = readJson<AiPromptManagementDataset>(
      "public/data/ai-prompt-management/zh.json",
    );
    const english = readJson<AiPromptManagementDataset>(
      "public/data/ai-prompt-management/en.json",
    );
    const hanPattern = /\p{Script=Han}/u;

    expect(chinese.total).toBe(418);
    expect(english.total).toBe(418);
    expect(chinese.entries).toHaveLength(418);
    expect(english.entries).toHaveLength(418);
    expect(chinese.categories).toHaveLength(11);
    expect(english.categories).toHaveLength(11);
    expect(english.entries.map((entry) => entry.id)).toEqual(
      chinese.entries.map((entry) => entry.id),
    );

    for (const entry of english.entries) {
      expect(entry.title.trim()).toBeTruthy();
      expect(entry.summary.trim()).toBeTruthy();
      expect(entry.prompt.trim()).toBeTruthy();
      expect(
        hanPattern.test(
          [
            entry.category,
            entry.title,
            entry.summary,
            entry.prompt,
            ...entry.tags,
          ].join("\n"),
        ),
      ).toBe(false);
    }
  });

  it("describes only verified features on the English prompt library page", () => {
    const pageShell = read(
      "src/app/skill-learning/ai-prompt-management/page-shell.tsx",
    );
    const englishCopy =
      pageShell.split("  en: {")[1]?.split("\n  },\n} as const")[0] ?? "";

    expect(englishCopy).toContain("Search by task");
    expect(englishCopy).toContain("filter by category");
    expect(englishCopy).toContain("add your own context");
    expect(englishCopy).toContain("copy a prompt");
    expect(englishCopy).not.toMatch(/favorite/i);
    expect(englishCopy).not.toMatch(/offline prompt-library use/i);
    expect(englishCopy).not.toMatch(/system requirements|account center/i);
  });
});
