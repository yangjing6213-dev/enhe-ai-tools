import { describe, expect, it } from "vitest";
import {
  aiTrendDateSlugToDate,
  buildAiTrendLoginUrl,
  isValidAiTrendDateSlug,
  localizeAiTrendBriefingView,
  normalizeAiTrendDemandBreakdowns,
  normalizeAiTrendSourceSignals,
  sanitizeAiTrendBriefingHtml,
  toAiTrendBriefingView,
  validateAiTrendBriefingInput,
  type AiTrendBriefingRecord
} from "@/lib/ai-trends";

const validSourceSignals = [
  {
    title: "Google Trends",
    url: "https://trends.google.com/trends/",
    sourceType: "search trend",
    observedSignal: "AI video and AI productivity queries remain prominent."
  }
];


const validDemandBreakdowns = [
  {
    direction: "工作效率",
    heat: 96,
    summary: "高频、耗时、跨工具的知识工作最需要 AI 先落地。",
    scenarios: [
      {
        name: "会议纪要与行动项追踪",
        heat: 94,
        urgency: "A",
        typicalUsers: ["团队负责人", "销售", "项目经理"],
        painPoint: "会议后信息散落，行动项没人持续追踪。",
        representativeScenarios: ["录音转纪要", "自动提取待办", "会后邮件同步"],
        aiValue: "把会议内容变成可执行任务和可复盘记录。",
        productOpportunity: "会议助手、CRM 跟进插件、项目管理自动同步。",
        developmentPriority: "A",
        evidenceSignals: ["search trend", "SaaS releases"]
      },
      {
        name: "文档和报告初稿",
        heat: 89,
        urgency: "A",
        typicalUsers: ["运营", "咨询顾问"],
        painPoint: "空白页启动慢，资料整理耗时。",
        representativeScenarios: ["周报", "方案", "复盘"],
        aiValue: "从素材直接生成可编辑初稿。",
        productOpportunity: "行业报告模板和知识库写作工作流。",
        developmentPriority: "A",
        evidenceSignals: ["creator discussion"]
      }
    ]
  }
];
const validInput = {
  date: "2026-06-19",
  title: "AI 需求趋势分析",
  summary: "本期摘要显示，用户最想用 AI 处理重复工作、内容生产和复杂研究。",
  coreConclusion: "AI 的高频需求正在从尝鲜转向可衡量的任务完成。",
  publicHighlights: ["工作效率仍是最强需求", "视频生成和内容创作保持高热度"],
  fullHtml: "<article><h1>AI 需求趋势分析</h1><p>完整报告正文。</p></article>",
  sourceSignals: validSourceSignals,
  demandBreakdowns: validDemandBreakdowns,
  status: "published" as const
};

const validBriefing: AiTrendBriefingRecord = {
  id: "briefing-1",
  date: new Date("2026-06-19T00:00:00.000Z"),
  slug: "2026-06-19",
  title: "AI 需求趋势分析",
  summary: "公开摘要",
  coreConclusion: "核心结论",
  publicHighlights: ["亮点一", "亮点二"],
  fullHtml: "<article><p>完整 HTML</p></article>",
  sourceSignals: {
    sources: validSourceSignals,
    demandBreakdowns: validDemandBreakdowns
  },
  status: "published",
  publishedAt: new Date("2026-06-19T00:00:00.000Z"),
  isIncludedInTopicPage: true,
  createdAt: new Date("2026-06-19T00:00:00.000Z"),
  updatedAt: new Date("2026-06-19T00:00:00.000Z")
};

describe("AI trend briefing helpers", () => {
  it("accepts only real YYYY-MM-DD date slugs", () => {
    expect(isValidAiTrendDateSlug("2026-06-19")).toBe(true);
    expect(isValidAiTrendDateSlug("2026-6-19")).toBe(false);
    expect(isValidAiTrendDateSlug("2026-02-30")).toBe(false);
    expect(aiTrendDateSlugToDate("2026-06-19").toISOString()).toBe("2026-06-19T00:00:00.000Z");
  });

  it("rejects unsafe generated HTML before it can be rendered", () => {
    expect(() => sanitizeAiTrendBriefingHtml("<script>alert(1)</script>")).toThrow(/script/i);
    expect(() => sanitizeAiTrendBriefingHtml('<a onclick="alert(1)">x</a>')).toThrow(/event handler/i);
    expect(() => sanitizeAiTrendBriefingHtml('<a href="javascript:alert(1)">x</a>')).toThrow(/javascript/i);
    expect(sanitizeAiTrendBriefingHtml("\uFEFF<article><p>安全内容</p></article>")).toBe(
      "<article><p>安全内容</p></article>"
    );
  });

  it("requires credible source signals before publishing a briefing", () => {
    expect(() =>
      validateAiTrendBriefingInput({
        ...validInput,
        sourceSignals: []
      })
    ).toThrow(/source/i);

    expect(validateAiTrendBriefingInput(validInput)).toMatchObject({
      slug: "2026-06-19",
      title: validInput.title,
      status: "published"
    });
  });

  it("normalizes source signals and drops invalid rows", () => {
    expect(
      normalizeAiTrendSourceSignals([
        ...validSourceSignals,
        { title: "No URL", sourceType: "social", observedSignal: "missing URL" },
        { title: "Bad URL", url: "ftp://example.com", sourceType: "web", observedSignal: "bad protocol" }
      ])
    ).toEqual(validSourceSignals);
  });


  it("normalizes structured demand breakdowns for second-level scenario ranking", () => {
    expect(
      normalizeAiTrendDemandBreakdowns([
        ...validDemandBreakdowns,
        { direction: "", scenarios: validDemandBreakdowns[0].scenarios },
        { direction: "空场景", scenarios: [] }
      ])
    ).toEqual(validDemandBreakdowns);
  });
  it("keeps full HTML out of public views and includes it for logged-in users", () => {
    const publicView = toAiTrendBriefingView(validBriefing, false);
    expect(publicView).not.toHaveProperty("fullHtml");
    expect(publicView.sourceSignals).toEqual(validSourceSignals);
    expect(publicView.demandBreakdowns).toEqual(validDemandBreakdowns);
    expect(toAiTrendBriefingView(validBriefing, true)).toHaveProperty("fullHtml", validBriefing.fullHtml);
  });


  it("accepts demand breakdowns in publish input without requiring a database migration", () => {
    const data = validateAiTrendBriefingInput(validInput);

    expect(data.demandBreakdowns).toEqual(validDemandBreakdowns);
    expect(data.sourcePayload).toEqual({
      sources: validSourceSignals,
      demandBreakdowns: validDemandBreakdowns
    });
  });
  it("builds login URLs that return to the requested daily report", () => {
    expect(buildAiTrendLoginUrl("2026-06-19")).toBe("/login?next=%2Fai-trends%2Fdaily%2F2026-06-19");
    expect(buildAiTrendLoginUrl("2026-06-19", "en")).toBe("/en/login?next=%2Fen%2Fai-trends%2Fdaily%2F2026-06-19");
  });

  it("builds English-safe trend briefings when stored content is only available in Chinese", () => {
    const localized = localizeAiTrendBriefingView(toAiTrendBriefingView(validBriefing, true), "en");

    expect(localized.title).toBe("AI Demand Briefing - 2026-06-19");
    expect(localized.summary).not.toMatch(/[\u3400-\u9fff]/);
    expect(localized.coreConclusion).not.toMatch(/[\u3400-\u9fff]/);
    expect(localized.publicHighlights.join(" ")).not.toMatch(/[\u3400-\u9fff]/);
    expect(localized.sourceSignals[0]?.observedSignal).not.toMatch(/[\u3400-\u9fff]/);
    expect(localized.fullHtml).toContain("AI Demand Briefing");
    expect(localized.fullHtml).not.toMatch(/[\u3400-\u9fff]/);
  });
});
