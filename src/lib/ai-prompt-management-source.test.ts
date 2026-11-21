import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  filterAiPromptManagementPrompts,
  type AiPromptManagementDataset,
  type AiPromptManagementPrompt,
} from "@/lib/ai-prompt-management";
import { REDESIGN_NAV_ITEMS } from "@/components/redesign/navigation";

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

  it("lists the prompt library under AI Resources in both locales", () => {
    const chineseResources = REDESIGN_NAV_ITEMS.zh.find(
      (item) => item.href === "/ai-skills",
    );
    const englishResources = REDESIGN_NAV_ITEMS.en.find(
      (item) => item.href === "/en/ai-skills",
    );

    expect(chineseResources?.label).toBe("AI资源");
    expect(chineseResources?.children).toContainEqual({
      label: "提示词库",
      href: "/skill-learning/ai-prompt-management",
    });
    expect(englishResources?.label).toBe("AI Resources");
    expect(englishResources?.children).toContainEqual({
      label: "Prompt Library",
      href: "/en/skill-learning/ai-prompt-management",
    });
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
    expect(chinese.categories).toContain("小红书");
    expect(chinese.categories).not.toContain("红书");
    expect(chinese.entries.some((entry) => /大师|大神/.test(entry.title))).toBe(false);

    const expectedCorrections = [
      ["curated-编程-职业导师", "职场", "职业规划助手", "Workplace", "Career Planning Assistant"],
      ["curated-编程-领导团队", "职场", "团队管理助手", "Workplace", "Team Management Assistant"],
      ["curated-编程-excel表格专家", "职场", "Excel表格助手", "Workplace", "Excel Spreadsheet Assistant"],
      ["curated-编程-商务应用高频学习", "职场", "商务英语高频词汇", "Workplace", "Business English Vocabulary"],
      ["curated-编程-文章扩写提示词框架", "写作", "文章扩写助手", "Writing", "Article Expansion Assistant"],
      ["curated-编程-ppt-生成器", "职场", "PPT生成助手", "Workplace", "PPT Creation Assistant"],
      ["curated-编程-excel助手", "职场", "Excel助手", "Workplace", "Excel Assistant"],
      ["curated-编程-项目日报生成助手", "职场", "项目日报生成助手", "Workplace", "Project Daily Report Assistant"],
      ["curated-编程-定制财务分析智能体", "运营", "财务分析整理助手", "Operations", "Financial Analysis Organizer"],
      ["curated-编程-教育教学设计师", "职场", "教学设计助手", "Workplace", "Instructional Design Assistant"],
      ["curated-职场-面试提问大师", "职场", "面试问题设计助手", "Workplace", "Interview Question Planner"],
      ["curated-问答-项目起名大师", "问答", "项目命名助手", "General", "Project Naming Assistant"],
      ["curated-职场-excel函数大神", "职场", "Excel函数助手", "Workplace", "Excel Formula Assistant"],
      ["curated-生活-万能标题大师", "生活", "多场景标题助手", "Life", "Multi-Purpose Headline Assistant"],
      ["curated-论文-写作-审查大师", "论文", "写作与校对助手", "Academic Writing", "Writing and Review Assistant"],
      ["curated-运营-麦肯锡问题角色大师", "运营", "结构化问题分析助手", "Operations", "Structured Problem Analysis Assistant"],
      ["curated-视频-文案拆解大师", "视频", "口播文案结构分析助手", "Video", "Spoken Script Structure Analyzer"],
      ["curated-问答-人生决策大师", "问答", "决策选项梳理助手", "General", "Decision Options Organizer"],
      ["curated-视频-书籍解构大师", "视频", "书籍内容分析助手", "Video", "Book Content Analysis Assistant"],
      ["curated-问答-思维模型大师", "问答", "思维模型练习助手", "General", "Thinking Model Practice Assistant"],
      ["curated-编程-工程合同审查智能体", "问答", "工程合同条款梳理助手", "General", "Engineering Contract Clause Organizer"],
      ["curated-编程-技术服务合同审查专家", "问答", "技术服务合同条款检查助手", "General", "Technology Services Contract Checklist Assistant"],
      ["curated-编程-法律合同审查智能体", "问答", "法律合同条款检查助手", "General", "Legal Contract Clause Review Assistant"],
    ] as const;
    for (const [id, category, title, englishCategory, englishTitle] of expectedCorrections) {
      const entry = chinese.entries.find((item) => item.id === id);
      expect(entry && [entry.category, entry.title]).toEqual([category, title]);
      const englishEntry = english.entries.find((item) => item.id === id);
      expect(englishEntry && [englishEntry.category, englishEntry.title]).toEqual([
        englishCategory,
        englishTitle,
      ]);
    }

    const financial = chinese.entries.find(
      (entry) => entry.id === "curated-编程-定制财务分析智能体",
    );
    expect(financial?.prompt).not.toContain("具备注册会计师");
    expect(financial?.prompt).not.toContain("采用先进的加密技术");
    expect(financial?.prompt).toContain("不声称具有注册会计师资质");
    expect(financial?.prompt).toContain("不构成投资建议");
    const therapy = chinese.entries.find(
      (entry) => entry.id === "curated-生活-心理治疗专家",
    );
    expect(therapy?.title).toBe("情绪支持与自我反思助手");
    expect(therapy?.prompt).toContain("不进行诊断或治疗");
    const medical = chinese.entries.find(
      (entry) => entry.id === "curated-图片-问诊助手",
    );
    expect(medical?.title).toBe("病历信息整理助手");
    expect(medical?.prompt).toContain("不作诊断或处方");
    const legal = chinese.entries.find(
      (entry) => entry.id === "curated-编程-法律合同审查智能体",
    );
    expect(legal?.prompt).toContain("执业律师确认");
    const structuredAnalysis = chinese.entries.find(
      (entry) => entry.id === "curated-运营-麦肯锡问题角色大师",
    );
    expect(structuredAnalysis?.prompt).not.toContain("麦肯锡");

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
