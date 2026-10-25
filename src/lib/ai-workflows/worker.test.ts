import { describe, expect, it } from "vitest";
import {
  AI_WORKFLOW_MAX_BATCH_ATTEMPTS,
  createAiWorkflowLeaseToken,
  getAiWorkflowBatchCompletionState,
  getAiWorkflowShanghaiDate,
  hashAiWorkflowLeaseToken,
  isAiWorkflowScheduleDue,
  selectNextAiWorkflowTopic,
  verifyAiWorkflowLeaseToken,
} from "@/lib/ai-workflows/worker";

describe("AI Workflow worker scheduling", () => {
  it("uses the Shanghai calendar date and waits until the configured local time", () => {
    const beforeNine = new Date("2026-10-20T00:59:00.000Z");
    const atNine = new Date("2026-10-20T01:00:00.000Z");

    expect(getAiWorkflowShanghaiDate(beforeNine)).toBe("2026-10-20");
    expect(isAiWorkflowScheduleDue("09:00", beforeNine)).toBe(false);
    expect(isAiWorkflowScheduleDue("09:00", atNine)).toBe(true);
  });

  it("rotates through the supplied ordered topics and handles an empty list", () => {
    const topics = [{ id: "first", name: "First" }, { id: "second", name: "Second" }];

    expect(selectNextAiWorkflowTopic(topics, 0)).toEqual(topics[0]);
    expect(selectNextAiWorkflowTopic(topics, 1)).toEqual(topics[1]);
    expect(selectNextAiWorkflowTopic(topics, 2)).toEqual(topics[0]);
    expect(selectNextAiWorkflowTopic([], 0)).toBeNull();
  });

  it("retries transient batch failures a bounded number of times without replacing saved candidates", () => {
    expect(AI_WORKFLOW_MAX_BATCH_ATTEMPTS).toBe(5);
    expect(getAiWorkflowBatchCompletionState(2, "NETWORK_UNAVAILABLE", 4)).toBe("paused");
    expect(getAiWorkflowBatchCompletionState(2, "NETWORK_UNAVAILABLE", 5)).toBe("partial");
    expect(getAiWorkflowBatchCompletionState(0, "GITHUB_RATE_LIMIT", 5)).toBe("failed");
    expect(getAiWorkflowBatchCompletionState(3, "NETWORK_UNAVAILABLE", 1)).toBe("completed");
  });
});

describe("AI Workflow batch lease tokens", () => {
  it("stores only a digest and verifies the returned token", () => {
    const token = createAiWorkflowLeaseToken();
    const digest = hashAiWorkflowLeaseToken(token);

    expect(token).toHaveLength(43);
    expect(digest).not.toContain(token);
    expect(verifyAiWorkflowLeaseToken(token, digest)).toBe(true);
    expect(verifyAiWorkflowLeaseToken("wrong-token", digest)).toBe(false);
    expect(verifyAiWorkflowLeaseToken(token, "invalid-digest")).toBe(false);
  });
});
