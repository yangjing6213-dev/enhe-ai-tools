import { describe, expect, it } from "vitest";
import { buildAiWorkflowSearchTerms, getAiWorkflowFailureCode, getAiWorkflowLinkOnlyFailureReason, redactAiWorkflowCollectorText, selectAiWorkflowRepositoryCandidates } from "./ai-workflow-collector";

describe("AI Workflow GitHub candidate selection", () => {
  it("keeps relevant-language candidates and ranks active repositories by stars", () => {
    const repository = (id: number, language: string | null, stars: number, updatedDaysAgo = 30) => ({
      id,
      full_name: `team/project-${id}`,
      html_url: `https://github.com/team/project-${id}`,
      private: false,
      archived: false,
      fork: false,
      default_branch: "main",
      license: { spdx_id: "MIT" },
      language,
      description: `AI workflow project ${id}`,
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
});

describe("AI Workflow collector diagnostics", () => {
  it("uses repository links only for packaging limits and failed project tests", () => {
    expect(getAiWorkflowLinkOnlyFailureReason("NO_LOCKED_NODE_TEST_SUITE")).toBe("NO_LOCKED_NODE_TEST_SUITE");
    expect(getAiWorkflowLinkOnlyFailureReason("NODE_MANIFEST_INVALID")).toBe("NODE_MANIFEST_INVALID");
    expect(getAiWorkflowLinkOnlyFailureReason(new Error("ARCHIVE_SIZE_LIMIT"))).toBe("ARCHIVE_SIZE_LIMIT");
    expect(getAiWorkflowLinkOnlyFailureReason("POSSIBLE_SECRET_IN_SOURCE")).toBeNull();
    expect(getAiWorkflowLinkOnlyFailureReason("LICENSE_NOT_REDISTRIBUTABLE")).toBeNull();
    expect(getAiWorkflowLinkOnlyFailureReason("NETWORK_UNAVAILABLE")).toBeNull();
  });

  it("includes the supplied topic directions in GitHub search terms", () => {
    expect(buildAiWorkflowSearchTerms("工作效率", "搜索趋势 / SaaS 产品发布 / 企业预算")).toEqual([
      "productivity automation workflow search trends",
      "productivity automation workflow SaaS product launch",
      "productivity automation workflow enterprise budget",
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
