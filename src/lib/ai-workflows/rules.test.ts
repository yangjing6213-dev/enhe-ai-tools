import { describe, expect, it } from "vitest";
import {
  canReviewAiWorkflow,
  isAiWorkflowArchiveReady,
  isAiWorkflowPurchaseReady,
  normalizeGitHubRepositoryUrl,
  resolveAiWorkflowDownloadFileId,
} from "@/lib/ai-workflows/rules";

describe("AI Workflow access rules", () => {
  it("requires an active purchase for a paid workflow review", () => {
    expect(canReviewAiWorkflow({ isPaid: true, hasActivePurchase: true, hasDownloaded: false })).toBe(true);
    expect(canReviewAiWorkflow({ isPaid: true, hasActivePurchase: false, hasDownloaded: true })).toBe(false);
  });

  it("requires an authenticated download event before a free workflow review", () => {
    expect(canReviewAiWorkflow({ isPaid: false, hasActivePurchase: false, hasDownloaded: true })).toBe(true);
    expect(canReviewAiWorkflow({ isPaid: false, hasActivePurchase: false, hasDownloaded: false })).toBe(false);
  });

  it("serves only the purchased version for paid workflows", () => {
    expect(resolveAiWorkflowDownloadFileId({ isPaid: true, currentFileId: "current", purchasedFileId: "purchased" })).toBe("purchased");
    expect(resolveAiWorkflowDownloadFileId({ isPaid: true, currentFileId: "current", purchasedFileId: null })).toBeNull();
    expect(resolveAiWorkflowDownloadFileId({ isPaid: false, currentFileId: "current", purchasedFileId: null })).toBe("current");
  });
});

describe("AI Workflow published purchase configuration", () => {
  const base = {
    candidateStatus: "published",
    candidateFileId: "file-1",
    toolFileId: "file-1",
  };

  it("allows an explicitly approved free workflow with its archived file", () => {
    expect(isAiWorkflowPurchaseReady({
      ...base,
      isDownloadPaid: false,
      downloadPrice: 0,
      priceDecision: "free",
      confirmedPrice: 0,
    })).toBe(true);
  });

  it("allows only the exact confirmed price for a paid workflow", () => {
    expect(isAiWorkflowPurchaseReady({
      ...base,
      isDownloadPaid: true,
      downloadPrice: 19,
      priceDecision: "paid",
      confirmedPrice: 19,
    })).toBe(true);
    expect(isAiWorkflowPurchaseReady({
      ...base,
      isDownloadPaid: true,
      downloadPrice: 20,
      priceDecision: "paid",
      confirmedPrice: 19,
    })).toBe(false);
  });

  it("rejects unapproved, mismatched, and invalid price decisions", () => {
    expect(isAiWorkflowPurchaseReady({ ...base, isDownloadPaid: false, downloadPrice: 0, priceDecision: null, confirmedPrice: 0 })).toBe(false);
    expect(isAiWorkflowPurchaseReady({ ...base, isDownloadPaid: false, downloadPrice: 0, priceDecision: "paid", confirmedPrice: 19 })).toBe(false);
    expect(isAiWorkflowPurchaseReady({ ...base, isDownloadPaid: true, downloadPrice: 9, priceDecision: "paid", confirmedPrice: 9 })).toBe(false);
    expect(isAiWorkflowPurchaseReady({ ...base, candidateFileId: "file-2", isDownloadPaid: false, downloadPrice: 0, priceDecision: "free", confirmedPrice: 0 })).toBe(false);
    expect(isAiWorkflowPurchaseReady({ ...base, candidateStatus: "pending_pricing", isDownloadPaid: false, downloadPrice: 0, priceDecision: "free", confirmedPrice: 0 })).toBe(false);
  });
});

describe("AI Workflow archive publication gate", () => {
  const packageSha = "b".repeat(64);
  const commitSha = "a".repeat(40);
  const bucket = "enhe-downloads-1303691623";
  const key = `ai-workflows/123456/${commitSha}/${packageSha}.zip`;
  const readyArchive = {
    repositoryId: "123456",
    commitSha,
    sourceFingerprint: `123456:${commitSha}`,
    licenseSpdx: "MIT",
    candidateFileId: "file-1",
    toolFileId: "file-1",
    packageVersion: commitSha,
    packageSize: BigInt(10),
    packageSha256: packageSha,
    validationReport: {
      source: { repositoryId: "123456", repositoryUrl: "https://github.com/example/workflow", commitSha },
      license: { spdx: "MIT", filePath: "LICENSE", fileSha256: "c".repeat(64), reviewSummary: "MIT terms and notice retention were checked." },
      validation: { command: "npm test", exitCode: 0, summary: "Core synthetic workflow passed.", recordedAt: "2026-10-19T17:30:00.000Z" },
      archive: { bucket, region: "ap-shanghai", objectKey: key, size: 10, sha256: packageSha, crc64: "42", remoteSize: 10, remoteCrc64: "42", anonymousReadDenied: true, contentType: "application/zip" },
    },
    productName: "Test workflow",
    productDescription: "Verified workflow package.",
    productContent: "Instructions and boundaries.",
    verifiedEnvironments: ["windows"],
    fileId: "file-1",
    filePath: `cos://${bucket}/${key}`,
    fileName: "workflow.zip",
    fileMimeType: "application/zip",
    fileStorageBucket: bucket,
    fileObjectKey: key,
    fileSize: BigInt(10),
    fileSha256: packageSha,
    fileVersion: commitSha,
    expectedDownloadBucket: bucket,
  };

  it("accepts only a matching immutable archive in the dedicated private bucket", () => {
    expect(isAiWorkflowArchiveReady(readyArchive)).toBe(true);
    expect(isAiWorkflowArchiveReady({ ...readyArchive, fileStorageBucket: "legacy-bucket-1303691623" })).toBe(false);
    expect(isAiWorkflowArchiveReady({ ...readyArchive, fileSha256: "c".repeat(64) })).toBe(false);
  });
});

describe("GitHub source URL normalization", () => {
  it("normalizes supported HTTPS and SSH repository URLs", () => {
    expect(normalizeGitHubRepositoryUrl("https://github.com/Example/Workflow.git")).toEqual({
      owner: "Example",
      name: "Workflow",
      url: "https://github.com/Example/Workflow",
    });
    expect(normalizeGitHubRepositoryUrl("git@github.com:Example/Workflow.git")).toMatchObject({ owner: "Example", name: "Workflow" });
  });

  it("rejects non-GitHub, nested, and malformed repository URLs", () => {
    expect(normalizeGitHubRepositoryUrl("https://example.com/a/b")).toBeNull();
    expect(normalizeGitHubRepositoryUrl("https://github.com/a/b/tree/main")).toBeNull();
    expect(normalizeGitHubRepositoryUrl("https://github.com/a/../b")).toBeNull();
  });
});
