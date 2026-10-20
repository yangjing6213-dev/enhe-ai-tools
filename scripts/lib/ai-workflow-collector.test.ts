import { describe, expect, it } from "vitest";
import { buildAiWorkflowSearchTerms, getAiWorkflowFailureCode, redactAiWorkflowCollectorText, selectAiWorkflowRepositoryCandidates } from "./ai-workflow-collector";

describe("AI Workflow GitHub candidate selection", () => {
  it("keeps only unique public repositories that are not already registered", () => {
    const selected = selectAiWorkflowRepositoryCandidates([
      { id: 11, full_name: "team/first", html_url: "https://github.com/team/first", private: false, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" }, stargazers_count: 10 },
      { id: 11, full_name: "team/first", html_url: "https://github.com/team/first", private: false, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" } },
      { id: 12, full_name: "team/already-used", html_url: "https://github.com/team/already-used", private: false, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" } },
      { id: 13, full_name: "team/private", html_url: "https://github.com/team/private", private: true, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" } },
      { id: 14, full_name: "team/archived", html_url: "https://github.com/team/archived", private: false, archived: true, fork: false, default_branch: "main", license: { spdx_id: "MIT" } },
      { id: 15, full_name: "team/malformed", html_url: "https://example.com/team/malformed", private: false, archived: false, fork: false, default_branch: "main", license: { spdx_id: "MIT" } },
    ], new Set(["12"]), 3);

    expect(selected.map(({ id, fullName }) => [id, fullName])).toEqual([["11", "team/first"]]);
  });
});

describe("AI Workflow collector diagnostics", () => {
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
