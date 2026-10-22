import { describe, expect, it } from "vitest";
import { parseAiWorkflowRepositoryLinkResult } from "../../src/lib/ai-workflows/worker-result";
import { buildAiWorkflowSearchTerms, getAiWorkflowFailureCode, getAiWorkflowLinkOnlyFailureReason, getAiWorkflowRegisteredRepositoryIds, isAiWorkflowCandidateRelevant, redactAiWorkflowCollectorText, restoreAiWorkflowCandidateMetadata, selectAiWorkflowRepositoryCandidates, skipAlreadyRegisteredRepository } from "./ai-workflow-collector";

describe("AI Workflow registered draft recovery", () => {
  it("counts three saved review drafts as a completed collection quota without requiring publication", () => {
    const registered = getAiWorkflowRegisteredRepositoryIds([
      { repositoryId: "11", status: "reviewing" },
      { repositoryId: "12", status: "reviewing" },
      { repositoryId: "13", status: "reviewing" },
      { repositoryId: "14", status: "rejected" },
    ]);
    expect(registered).toEqual(["11", "12", "13"]);
    expect(registered).toHaveLength(3);
  });

  it("keeps pending-price and published entries while deduplicating saved drafts and excluding unfinished candidates", () => {
    expect(getAiWorkflowRegisteredRepositoryIds([
      { repositoryId: "11", status: "reviewing" },
      { repositoryId: "11", status: "reviewing" },
      { repositoryId: "12", status: "pending_pricing" },
      { repositoryId: "13", status: "published" },
      { repositoryId: "14", status: "detected" },
      { repositoryId: "15", status: "testing" },
      { repositoryId: "16", status: "packaging" },
      { repositoryId: "17", status: "failed" },
    ])).toEqual(["11", "12", "13"]);
  });
});

describe("AI Workflow duplicate registration recovery", () => {
  it("clears a permanently duplicated pending registration so collection can continue", () => {
    const state = {
      completedRepositoryIds: [],
      outcomes: [] as Array<{ repositoryId: string; repository: string; state: "registered" | "rejected"; reason?: string }>,
      pendingRegistration: { repositoryId: "896335270", repository: "punkpeye/awesome-mcp-servers", result: { deliveryMode: "repository_link" } },
    };

    expect(skipAlreadyRegisteredRepository(state, "896335270")).toBe(true);
    expect(state.completedRepositoryIds).toEqual(["896335270"]);
    expect(state.outcomes).toEqual([{ repositoryId: "896335270", repository: "punkpeye/awesome-mcp-servers", state: "rejected", reason: "REPOSITORY_ALREADY_REGISTERED" }]);
    expect(state.pendingRegistration).toBeUndefined();
    expect(skipAlreadyRegisteredRepository(state, "896335270")).toBe(false);
  });

  it("leaves a pending result untouched when the duplicate ID does not match", () => {
    const pendingRegistration = { repositoryId: "896335270", repository: "punkpeye/awesome-mcp-servers", result: {} };
    const state = { completedRepositoryIds: [] as string[], outcomes: [] as Array<{ repositoryId: string; repository: string; state: "registered" | "rejected"; reason?: string }>, pendingRegistration };
    expect(skipAlreadyRegisteredRepository(state, "1035029907")).toBe(false);
    expect(state).toEqual({ completedRepositoryIds: [], outcomes: [], pendingRegistration });
  });
});

describe("AI Workflow cached candidate compatibility", () => {
  const legacyCandidate = {
    id: "1204165322",
    fullName: "team/workflow",
    url: "https://github.com/team/workflow",
    stars: 100,
    updatedAt: "2026-10-21T12:00:00Z",
    defaultBranch: "main",
    licenseSpdx: "MIT",
  };

  it("restores missing metadata so a legacy candidate can register its repository link", () => {
    const candidate = restoreAiWorkflowCandidateMetadata(legacyCandidate);
    expect(candidate).toEqual({ ...legacyCandidate, description: "", language: null });
    expect(legacyCandidate).not.toHaveProperty("description");
    expect(legacyCandidate).not.toHaveProperty("language");

    const result = parseAiWorkflowRepositoryLinkResult({
      deliveryMode: "repository_link",
      repositoryId: candidate.id,
      repositoryUrl: candidate.url,
      commitSha: "a".repeat(40),
      licenseSpdx: candidate.licenseSpdx,
      licenseFilePath: "LICENSE",
      projectType: "workflow",
      stars: candidate.stars,
      updatedAt: candidate.updatedAt,
      language: candidate.language,
      description: redactAiWorkflowCollectorText(candidate.description).slice(0, 500),
      failureReason: "PACKAGE_LANGUAGE_UNSUPPORTED",
    });
    expect(result.success).toBe(true);

    const copyleftLink = parseAiWorkflowRepositoryLinkResult({
      deliveryMode: "repository_link",
      repositoryId: candidate.id,
      repositoryUrl: candidate.url,
      commitSha: "a".repeat(40),
      licenseSpdx: "GPL-3.0-only",
      licenseFilePath: "LICENSE",
      projectType: "workflow",
      stars: candidate.stars,
      updatedAt: candidate.updatedAt,
      language: candidate.language,
      description: candidate.description,
      failureReason: "LICENSE_NOT_REDISTRIBUTABLE",
    });
    expect(copyleftLink.success).toBe(true);
  });

  it("preserves current metadata and defaults invalid cached values", () => {
    const candidate = { ...legacyCandidate, description: "AI workflow automation", language: "Python" };
    expect(restoreAiWorkflowCandidateMetadata(candidate)).toEqual(candidate);
    expect(restoreAiWorkflowCandidateMetadata({ ...legacyCandidate, description: null, language: 42 }))
      .toEqual({ ...legacyCandidate, description: "", language: null });
  });
});

describe("AI Workflow GitHub candidate selection", () => {
  it("keeps relevant-language candidates and ranks active repositories by stars", () => {
    const repository = (id: number, language: string | null, stars: number, updatedDaysAgo = 30, description = `AI workflow project ${id}`, topics: string[] = []) => ({
      id,
      full_name: `team/project-${id}`,
      html_url: `https://github.com/team/project-${id}`,
      private: false,
      archived: false,
      fork: false,
      default_branch: "main",
      license: { spdx_id: "MIT" },
      language,
      description,
      topics,
      stargazers_count: stars,
      updated_at: new Date(Date.now() - updatedDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
    });

    const selected = selectAiWorkflowRepositoryCandidates([
      repository(21, "Markdown", 30),
      repository(22, "Python", 500),
      repository(23, "JavaScript", 100),
      repository(24, "TypeScript", 200),
      repository(25, null, 0),
      repository(26, "Rust", 900, 900),
    ], new Set(), 4);

    expect(selected.map(({ id }) => id)).toEqual(["22", "24", "23", "21"]);
    expect(selected[0]).toMatchObject({ language: "Python", stars: 500, description: "AI workflow project 22" });
  });

  it("keeps only unique public repositories that are not already registered", () => {
    const selected = selectAiWorkflowRepositoryCandidates([
      { id: 11, full_name: "team/first", html_url: "https://github.com/team/first", private: false, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" }, language: "JavaScript", stargazers_count: 10, updated_at: new Date().toISOString() },
      { id: 11, full_name: "team/first", html_url: "https://github.com/team/first", private: false, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" }, language: "JavaScript", stargazers_count: 10, updated_at: new Date().toISOString() },
      { id: 12, full_name: "team/already-used", html_url: "https://github.com/team/already-used", private: false, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" }, language: "TypeScript", stargazers_count: 10, updated_at: new Date().toISOString() },
      { id: 13, full_name: "team/private", html_url: "https://github.com/team/private", private: true, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" }, language: "JavaScript", stargazers_count: 10, updated_at: new Date().toISOString() },
      { id: 14, full_name: "team/archived", html_url: "https://github.com/team/archived", private: false, archived: true, fork: false, default_branch: "main", license: { spdx_id: "MIT" }, language: "JavaScript", stargazers_count: 10, updated_at: new Date().toISOString() },
      { id: 15, full_name: "team/malformed", html_url: "https://example.com/team/malformed", private: false, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" }, language: "JavaScript", stargazers_count: 10, updated_at: new Date().toISOString() },
    ], new Set(["12"]), 3);

    expect(selected.map(({ id, fullName }) => [id, fullName])).toEqual([["11", "team/first"]]);
  });

  it("ranks topic-specific repositories ahead of higher-star incidental matches", () => {
    const repository = (id: number, description: string, stars: number, topics: string[], licenseSpdx = "MIT") => ({
      id,
      full_name: `team/project-${id}`,
      html_url: `https://github.com/team/project-${id}`,
      private: false,
      archived: false,
      fork: false,
      default_branch: "main",
      license: { spdx_id: licenseSpdx },
      language: "TypeScript",
      description,
      topics,
      stargazers_count: stars,
      updated_at: new Date().toISOString(),
    });

    const selected = selectAiWorkflowRepositoryCandidates([
      repository(30, "General AI tools", 100_000, ["ai", "tools"]),
      repository(31, "Developer productivity tools for coding workflows", 1_200, ["developer-productivity"], "GPL-3.0-only"),
    ], new Set(), 2, "工作效率");

    expect(selected.map(({ id }) => id)).toEqual(["31", "30"]);
  });
});

describe("AI Workflow collector diagnostics", () => {
  it("uses repository links only for packaging limits and failed project tests", () => {
    expect(getAiWorkflowLinkOnlyFailureReason("NO_LOCKED_NODE_TEST_SUITE")).toBe("NO_LOCKED_NODE_TEST_SUITE");
    expect(getAiWorkflowLinkOnlyFailureReason("NODE_MANIFEST_INVALID")).toBe("NODE_MANIFEST_INVALID");
    expect(getAiWorkflowLinkOnlyFailureReason(new Error("ARCHIVE_SIZE_LIMIT"))).toBe("ARCHIVE_SIZE_LIMIT");
    expect(getAiWorkflowLinkOnlyFailureReason("POSSIBLE_SECRET_IN_SOURCE")).toBeNull();
    expect(getAiWorkflowLinkOnlyFailureReason("LICENSE_NOT_REDISTRIBUTABLE")).toBe("LICENSE_NOT_REDISTRIBUTABLE");
    expect(getAiWorkflowLinkOnlyFailureReason("NETWORK_UNAVAILABLE")).toBeNull();
  });

  it("includes the supplied topic directions in GitHub search terms", () => {
    expect(buildAiWorkflowSearchTerms("工作效率", "搜索趋势 / SaaS 产品发布 / 企业预算")).toEqual([
      "work productivity tools search trends",
      "developer productivity workflow tools",
      "工作效率工具 工作方法 自动化",
    ]);
  });

  it("searches work-efficiency projects across jobs and programming workflows", () => {
    expect(buildAiWorkflowSearchTerms("工作效率", "")).toEqual([
      "work productivity tools",
      "developer productivity workflow tools",
      "工作效率工具 工作方法 自动化",
    ]);
  });

  it("searches video creation, editing, and generation instead of only text-to-video models", () => {
    expect(buildAiWorkflowSearchTerms("视频生成", "")).toEqual([
      "video generation",
      "video editor",
      "topic:video",
    ]);
  });

  it("distinguishes GitHub rate limits from unrelated server authorization failures", () => {
    expect(getAiWorkflowFailureCode({ code: "GITHUB_RATE_LIMIT", message: "GITHUB_RATE_LIMIT" })).toBe("GITHUB_RATE_LIMIT");
    expect(getAiWorkflowFailureCode({ status: 403, message: "WORKER_FORBIDDEN" })).toBe("UNKNOWN");
    expect(getAiWorkflowFailureCode({ code: "ENOTFOUND", message: "network unavailable" })).toBe("NETWORK_UNAVAILABLE");
  });

  it("removes supplied credentials and signed URL query values from log text", () => {
    const safe = redactAiWorkflowCollectorText(
      "authorization: Bearer worker-secret https://download.example/file.zip?sign=private COS_SECRET_KEY=cos-secret",
      ["worker-secret", "cos-secret"],
    );
    expect(safe).not.toContain("worker-secret");
    expect(safe).not.toContain("cos-secret");
    expect(safe).not.toContain("sign=private");
  });
});

describe("AI Workflow topic relevance", () => {
  const candidate = (fullName: string, description: string) => ({
    id: "1",
    fullName,
    url: `https://github.com/${fullName}`,
    description,
    language: "Python",
    stars: 1000,
    updatedAt: new Date().toISOString(),
    defaultBranch: "main",
    licenseSpdx: "MIT",
  });

  it("accepts projects for video generation and adjacent creation workflows", () => {
    expect(isAiWorkflowCandidateRelevant("视频生成", candidate("team/video-model", "Text-to-video generation model"), ""))
      .toBe(true);
    expect(isAiWorkflowCandidateRelevant("视频生成", candidate("team/model", "Open model"), "文生视频与图生视频生成工具"))
      .toBe(true);
  });

  it("rejects unrelated projects before packaging fallback can register a repository link", () => {
    expect(isAiWorkflowCandidateRelevant("视频生成", candidate("mlabonne/llm-course", "Course to get into Large Language Models"), "A course about language models, agents, and RAG."))
      .toBe(false);
    expect(isAiWorkflowCandidateRelevant("视频生成", candidate("pbakaus/impeccable", "The design language that makes your AI harness better at design."), "Design systems and UI guidelines for AI coding tools."))
      .toBe(false);
    expect(isAiWorkflowCandidateRelevant("视频生成", candidate("team/video-editor", "AI video editing software"), "Edit and assemble existing video clips."))
      .toBe(true);
    expect(isAiWorkflowCandidateRelevant("视频生成", candidate("team/shotcraft", "Video production workflow and shot-planning skills"), "Tools for planning camera shots and editing short videos."))
      .toBe(true);
    expect(isAiWorkflowCandidateRelevant("视频生成", candidate("earendil-works/pi", "The 1st collaborative AI design agent workspace. Create motion, prototypes, images, and videos."), "Create websites, apps, presentations, images, and videos with AI agents."))
      .toBe(false);
    const incidentalReadmeMention = `${"General AI toolkit. ".repeat(120)}Includes one video generation example.`;
    expect(isAiWorkflowCandidateRelevant("视频生成", candidate("team/general-ai", "General AI toolkit"), incidentalReadmeMention))
      .toBe(false);
    expect(getAiWorkflowLinkOnlyFailureReason("TOPIC_MISMATCH")).toBeNull();
  });

  it("does not apply built-in topic rules to custom topic names", () => {
    expect(isAiWorkflowCandidateRelevant("用户自定义主题", candidate("team/project", "A custom project"), ""))
      .toBe(true);
  });

  it("treats programming resources and methods as work-efficiency projects", () => {
    expect(isAiWorkflowCandidateRelevant("工作效率", candidate("team/dev-workflow", "Developer productivity tools for coding workflows"), ""))
      .toBe(true);
    expect(isAiWorkflowCandidateRelevant("工作效率", candidate("team/random-project", "A general software library"), ""))
      .toBe(false);
  });
});
