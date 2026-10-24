import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Script } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import {
  getAiWorkflowFailureCode,
  getAiWorkflowLinkOnlyFailureReason,
  getAiWorkflowRateLimitRetryAfterSeconds,
  getAiWorkflowRegisteredRepositoryIds,
  isAiWorkflowCandidateRetryableOutcome,
} from "./lib/ai-workflow-collector";

// Execute the real batch function without importing the CLI entrypoint, which
// starts the Windows collector. All external effects below are isolated stubs.
const source = ts.createSourceFile(
  "ai-workflow-collector.ts",
  readFileSync(new URL("./ai-workflow-collector.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const batchFunction = source.statements.find(
  (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "runBatch",
);
if (!batchFunction) throw new Error("Collector runBatch function was not found");
const batchScript = new Script(ts.transpileModule(`${batchFunction.getText(source)}\nrunBatch;`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText);

type Candidate = { id: string; fullName: string; collectionTopicId: string };
type TestState = {
  batchId: string;
  topic: string;
  candidateIds: Candidate[];
  searchedTopicIds: string[];
  completedRepositoryIds: string[];
  outcomes: Array<{ repositoryId: string; repository: string; state: string; reason?: string }>;
  candidateIndex: number;
  updatedAt: string;
  pendingRegistration?: { repositoryId: string; repository: string; result: Record<string, unknown> };
};

function createBatch(options: { delivery: "package" | "repository_link"; registered?: number; pending?: boolean; rejectFirst?: boolean }) {
  const candidates = Array.from({ length: options.rejectFirst ? 5 : 4 }, (_, index) => ({
    id: String(index + 1), fullName: `fixture/project-${index + 1}`, collectionTopicId: "topic-1",
  }));
  const registeredIds = candidates.slice(0, options.registered ?? 0).map(({ id }) => id);
  const state: TestState = {
    batchId: "fixture-batch", topic: "Fixture", candidateIds: candidates, searchedTopicIds: ["topic-1"],
    completedRepositoryIds: [...registeredIds], outcomes: [], candidateIndex: 0, updatedAt: "2026-10-23T00:00:00Z",
    ...(options.pending ? { pendingRegistration: { repositoryId: "3", repository: "fixture/project-3", result: {} } } : {}),
  };
  const register = ({ candidate }: { candidate: Candidate }) => {
    state.completedRepositoryIds.push(candidate.id);
    state.outcomes.push({ repositoryId: candidate.id, repository: candidate.fullName, state: "registered" });
  };
  const processCandidate = vi.fn(async (input: { candidate: Candidate }) => {
    if (options.rejectFirst && input.candidate.id === "1") throw new Error("TOPIC_MISMATCH");
    if (options.delivery === "repository_link") throw new Error("PACKAGE_LANGUAGE_UNSUPPORTED");
    register(input);
  });
  const registerRepositoryLinkOnly = vi.fn(async (input: { candidate: Candidate }) => register(input));
  const postWorker = vi.fn(async (_path: string, _body: unknown) => ({ state: "active" }));
  const runBatch = batchScript.runInNewContext({
    Error, AbortController, dirname, join,
    runnerRoot: "/fixture/runner", runsRoot: "/fixture/runs",
    maximumCandidates: 15, maximumBatchMs: 120_000, minimumFreeBytes: 1,
    completionFailureCodes: new Set(["INSUFFICIENT_CANDIDATES"]),
    mkdir: vi.fn(async () => undefined),
    statfs: vi.fn(async () => ({ bavail: 10, bsize: 10 })),
    stat: vi.fn(async () => ({})),
    readRunState: vi.fn(async () => state),
    persistRunState: vi.fn(async () => undefined),
    logEvent: vi.fn(async () => undefined),
    removeOwnedCandidateDirectory: vi.fn(async () => true),
    setInterval: vi.fn(() => ({ unref: vi.fn() })), clearInterval: vi.fn(),
    workerId: () => "fixture-worker",
    getTopicSearchPlan: () => [{ id: "topic-1", name: "Fixture", searchDirections: "Fixture" }],
    getAiWorkflowRegisteredRepositoryIds, getAiWorkflowFailureCode, getAiWorkflowLinkOnlyFailureReason,
    getAiWorkflowRateLimitRetryAfterSeconds, isAiWorkflowCandidateRetryableOutcome,
    hasPendingRegistrationFor: (current: TestState, id: string) => current.pendingRegistration?.repositoryId === id,
    processCandidate, registerRepositoryLinkOnly, postWorker,
  }) as (lease: unknown, token: string, credentials: unknown) => Promise<void>;
  return {
    state, processCandidate, registerRepositoryLinkOnly, postWorker,
    run: () => runBatch({
      leaseToken: "fixture-lease",
      batch: {
        id: state.batchId, topicId: "topic-1", topicNameSnapshot: "Fixture", topicSearchDirectionsSnapshot: "Fixture",
        candidates: registeredIds.map((repositoryId) => ({ repositoryId, status: "reviewing", commitSha: null })),
      },
    }, "fixture-token", {}),
  };
}

describe("AI workflow batch collection quota", () => {
  it.each(["package", "repository_link"] as const)("stops before a fourth %s registration", async (delivery) => {
    const batch = createBatch({ delivery });
    await batch.run();

    expect(batch.state.completedRepositoryIds).toEqual(["1", "2", "3"]);
    expect(batch.processCandidate.mock.calls.map(([input]) => input.candidate.id)).toEqual(["1", "2", "3"]);
    expect(batch.registerRepositoryLinkOnly).toHaveBeenCalledTimes(delivery === "repository_link" ? 3 : 0);
    expect(batch.postWorker).toHaveBeenCalledWith("/fixture-batch/complete", {
      workerId: "fixture-worker", leaseToken: "fixture-lease", state: "completed",
    }, "fixture-token");
  });

  it.each(["package", "repository_link"] as const)("counts saved drafts toward the %s quota", async (delivery) => {
    const batch = createBatch({ delivery, registered: 2 });
    await batch.run();

    expect(batch.state.completedRepositoryIds).toEqual(["1", "2", "3"]);
    expect(batch.processCandidate.mock.calls.map(([input]) => input.candidate.id)).toEqual(["3"]);
  });

  it("continues past a rejected candidate until three registrations succeed", async () => {
    const batch = createBatch({ delivery: "package", rejectFirst: true });
    await batch.run();

    expect(batch.state.completedRepositoryIds).toEqual(["2", "3", "4"]);
    expect(batch.processCandidate.mock.calls.map(([input]) => input.candidate.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("does not collect another candidate after pending registration recovery fills the quota", async () => {
    const batch = createBatch({ delivery: "package", registered: 2, pending: true });
    await batch.run();

    expect(batch.state.completedRepositoryIds).toEqual(["1", "2", "3"]);
    expect(batch.state.pendingRegistration).toBeUndefined();
    expect(batch.processCandidate).not.toHaveBeenCalled();
    expect(batch.postWorker.mock.calls.map(([path]) => path)).toEqual(["/fixture-batch/result", "/fixture-batch/complete"]);
  });
});
