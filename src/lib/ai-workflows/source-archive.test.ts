import { describe, expect, it } from "vitest";
import { buildAiWorkflowSourceArchiveObjectKey } from "@/lib/ai-workflows/cos";
import {
  buildAiWorkflowGitHubSourceArchiveUrl,
  buildAiWorkflowSourceArchiveFileName,
  getAiWorkflowSourceArchiveDeliveryFromReport,
  parseAiWorkflowSourceArchiveDelivery,
} from "@/lib/ai-workflows/source-archive";

const commit = "a".repeat(40);
const repositoryUrl = "https://github.com/example/agent-flow";
const repositoryId = "123456";
const sha256 = "b".repeat(64);
const bucket = "enhe-downloads-1303691623";
const upstreamUrl = `https://github.com/example/agent-flow/archive/${commit}.zip`;

function archive(overrides: Record<string, unknown> = {}) {
  const objectKey = buildAiWorkflowSourceArchiveObjectKey(repositoryId, commit, sha256);
  return {
    sha256,
    size: 2048,
    crc64: "1234567890123",
    remoteSize: 2048,
    remoteCrc64: "1234567890123",
    anonymousReadDenied: true,
    bucket,
    region: "ap-shanghai",
    objectKey,
    filePath: `cos://${bucket}/${objectKey}`,
    contentType: "application/zip",
    ...overrides,
  };
}

const context = {
  repositoryId,
  repositoryUrl,
  commitSha: commit,
  licenseSpdx: "MIT",
  downloadBucket: bucket,
  region: "ap-shanghai",
};

describe("AI Workflow upstream source archives", () => {
  it("builds an immutable GitHub ZIP link from a normalized repository and commit", () => {
    expect(buildAiWorkflowGitHubSourceArchiveUrl(`${repositoryUrl}/`, commit.toUpperCase())).toBe(upstreamUrl);
    expect(buildAiWorkflowGitHubSourceArchiveUrl("https://example.com/repo", commit)).toBeNull();
    expect(buildAiWorkflowGitHubSourceArchiveUrl(repositoryUrl, "main")).toBeNull();
    expect(buildAiWorkflowSourceArchiveFileName(repositoryUrl, commit)).toBe("agent-flow-aaaaaaaa-source.zip");
  });

  it("accepts a private COS mirror only when license and remote archive evidence match", () => {
    const delivery = { deliveryMode: "cos", upstreamUrl, archive: archive() };
    expect(parseAiWorkflowSourceArchiveDelivery(delivery, context)).toEqual(delivery);
    expect(parseAiWorkflowSourceArchiveDelivery(delivery, { ...context, licenseSpdx: "GPL-3.0-only" })).toBeNull();
    expect(parseAiWorkflowSourceArchiveDelivery({ ...delivery, archive: archive({ remoteSize: 2047 }) }, context)).toBeNull();
    expect(parseAiWorkflowSourceArchiveDelivery({ ...delivery, archive: archive({ objectKey: "ai-workflows/other.zip" }) }, context)).toBeNull();
  });

  it("keeps the GitHub fallback for projects that are not mirrored", () => {
    const delivery = { deliveryMode: "github", upstreamUrl, failureReason: "LICENSE_NOT_REDISTRIBUTABLE" };
    expect(parseAiWorkflowSourceArchiveDelivery(delivery, { ...context, licenseSpdx: "GPL-3.0-only" })).toEqual(delivery);
    expect(getAiWorkflowSourceArchiveDeliveryFromReport({ sourceArchive: delivery }, context)).toEqual(delivery);
    expect(parseAiWorkflowSourceArchiveDelivery({ ...delivery, upstreamUrl: "https://example.com/file.zip" }, context)).toBeNull();
  });
});
