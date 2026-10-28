import { describe, expect, it } from "vitest";
import {
  aiTrendDateSlugToDate,
  buildAiTrendLoginUrl,
  hasRenderableAiTrendVideo,
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
  videoUrl: "/uploads/ai-trends/2026-06-19/briefing.mp4",
  videoTitle: "AI需求趋势视频晨报",
  videoDescription: "围绕最新一期 AI 需求趋势简报生成的视频摘要。",
  videoPosterUrl: "/uploads/ai-trends/2026-06-19/poster.jpg",
  videoDurationSeconds: 48,
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
  videoUrl: "/uploads/ai-trends/2026-06-19/briefing.mp4",
  videoTitle: "AI需求趋势视频晨报",
  videoDescription: "围绕最新一期 AI 需求趋势简报生成的视频摘要。",
  videoPosterUrl: "/uploads/ai-trends/2026-06-19/poster.jpg",
  videoDurationSeconds: 48,
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
      status: "published",
      isIncludedInTopicPage: true,
      videoUrl: "/api/uploads/ai-trends/2026-06-19/briefing.mp4",
      videoPosterUrl: "/api/uploads/ai-trends/2026-06-19/poster.jpg",
      videoDurationSeconds: 48
    });
  });

  it("rejects encoding-corrupted Chinese briefing text before publish or render", () => {
    expect(() =>
      validateAiTrendBriefingInput({
        ...validInput,
        title: "AI ????????????? AI ??????",
        summary: "???? OpenAI?Stanford HAI?PwC?Microsoft?Anthropic?Similarweb ??????",
        coreConclusion: "?????????AI ??????????????????"
      })
    ).toThrow(/encoding-corrupted/i);
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

  it("normalizes structured demand breakdowns", () => {
    expect(
      normalizeAiTrendDemandBreakdowns([
        ...validDemandBreakdowns,
        { direction: "", scenarios: validDemandBreakdowns[0].scenarios },
        { direction: "空场景", scenarios: [] }
      ])
    ).toEqual(validDemandBreakdowns);
  });

  it("preserves editorial order instead of sorting by unverified heat values", () => {
    const source = validDemandBreakdowns[0];
    const normalized = normalizeAiTrendDemandBreakdowns([
      {
        ...source,
        direction: "先列出的方向",
        heat: 0,
        scenarios: [
          { ...source.scenarios[0], name: "先列出的场景", heat: 0 },
          { ...source.scenarios[1], name: "后列出的场景", heat: 100 }
        ]
      },
      { ...source, direction: "后列出的方向", heat: 100 }
    ]);

    expect(normalized.map((item) => item.direction)).toEqual(["先列出的方向", "后列出的方向"]);
    expect(normalized[0].scenarios.map((item) => item.name)).toEqual(["先列出的场景", "后列出的场景"]);
  });

  it("keeps full HTML out of public views and includes it for logged-in users", () => {
    const publicView = toAiTrendBriefingView(validBriefing, false);
    expect(publicView).not.toHaveProperty("fullHtml");
    expect(publicView.sourceSignals).toEqual(validSourceSignals);
    expect(publicView.demandBreakdowns).toEqual(validDemandBreakdowns);
    expect(publicView.videoUrl).toBe("/api/uploads/ai-trends/2026-06-19/briefing.mp4");
    expect(publicView.videoTitle).toBe("AI需求趋势视频晨报");
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

  it("detects whether a briefing has a renderable video", () => {
    expect(hasRenderableAiTrendVideo({ videoUrl: null })).toBe(false);
    expect(hasRenderableAiTrendVideo({ videoUrl: "" })).toBe(false);
    expect(hasRenderableAiTrendVideo({ videoUrl: "/uploads/ai-trends/demo.mp4" })).toBe(true);
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

  it("discloses missing English analysis without inventing findings or replacing the source record", () => {
    const view = toAiTrendBriefingView(validBriefing, true);
    const localized = localizeAiTrendBriefingView(view, "en");

    expect(localized.summary).toContain("An English summary has not been provided");
    expect(localized.coreConclusion).toContain("original Chinese briefing");
    expect(localized.publicHighlights.join(" ")).not.toMatch(/clearest signal|strongest opportunity|saves time/i);
    expect(localized.demandBreakdowns).toEqual([]);
    expect(localized.slug).toBe(view.slug);
    expect(localized.sourceSignals).toEqual(view.sourceSignals);
    expect(localized.fullHtml).toContain('href="/ai-trends/daily/2026-06-19"');
    expect(localized.fullHtml).toContain('target="_blank"');
    expect(localized.fullHtml).not.toMatch(/measurable efficiency gains|real-world demand signals/i);
    expect(localizeAiTrendBriefingView(toAiTrendBriefingView(validBriefing, false), "en")).not.toHaveProperty("fullHtml");
  });

  it("preserves supplied English analysis and scenarios instead of substituting fallback claims", () => {
    const view = {
      ...toAiTrendBriefingView(validBriefing, true),
      title: "Source review",
      summary: "One official release was reviewed.",
      coreConclusion: "A feature announcement does not establish demand.",
      publicHighlights: ["Verify account availability before testing."],
      demandBreakdowns: [{
        direction: "Research", heat: 0, summary: "Check sources", scenarios: [{
          name: "Review one document", heat: 0, urgency: "", typicalUsers: ["Creators"],
          painPoint: "Claims need checking", representativeScenarios: ["Review a draft"],
          aiValue: "Draft assistance", productOpportunity: "Unvalidated", developmentPriority: "Try a sample", evidenceSignals: ["Official source"]
        }]
      }],
      fullHtml: "<article><p>Actual English analysis.</p></article>"
    };

    expect(localizeAiTrendBriefingView(view, "en")).toEqual(view);
  });

  it("normalizes serialized date fields before topic-page rendering", () => {
    const publicView = toAiTrendBriefingView(
      {
        ...validBriefing,
        date: "2026-06-19T00:00:00.000Z" as unknown as Date,
        publishedAt: "2026-06-19T00:00:00.000Z" as unknown as Date,
        createdAt: "2026-06-19T00:00:00.000Z" as unknown as Date,
        updatedAt: "2026-06-19T00:00:00.000Z" as unknown as Date
      },
      false
    );

    expect(publicView.date).toBeInstanceOf(Date);
    expect(publicView.publishedAt).toBeInstanceOf(Date);
    expect(publicView.publishedAt?.toISOString()).toBe("2026-06-19T00:00:00.000Z");
  });
});
