import { describe, expect, it } from "vitest";
import { buildAiWorkflowArchiveObjectKey, buildAiWorkflowSourceArchiveObjectKey, calculateCosCrc64Ecma, getAiWorkflowCosConfig, getAiWorkflowCosOperationFailure, getAiWorkflowDownloadUrl } from "@/lib/ai-workflows/cos";

describe("AI Workflow COS configuration", () => {
  it("uses only the dedicated workflow buckets and defaults to the Shanghai region", () => {
    expect(getAiWorkflowCosConfig({
      COS_SECRET_ID: "id",
      COS_SECRET_KEY: "key",
    })).toMatchObject({
      region: "ap-shanghai",
      staticBucket: "enhe-static-1303691623",
      downloadBucket: "enhe-downloads-1303691623",
      signExpiresSeconds: 3600,
    });
  });

  it("does not treat the legacy single-bucket settings as workflow storage", () => {
    expect(getAiWorkflowCosConfig({
      TENCENT_COS_SECRET_ID: "legacy-id",
      TENCENT_COS_SECRET_KEY: "legacy-key",
      TENCENT_COS_BUCKET: "legacy-bucket-1303691623",
      TENCENT_COS_REGION: "ap-shanghai",
    })).toBeNull();
  });
});

describe("AI Workflow archive identity and transfer verification", () => {
  it("uses a repository, fixed commit, and archive hash for an immutable object key", () => {
    expect(buildAiWorkflowArchiveObjectKey("123456", "a".repeat(40), "b".repeat(64))).toBe(
      `ai-workflows/123456/${"a".repeat(40)}/${"b".repeat(64)}.zip`,
    );
    expect(buildAiWorkflowSourceArchiveObjectKey("123456", "a".repeat(40), "b".repeat(64))).toBe(
      `ai-workflows/source/123456/${"a".repeat(40)}/${"b".repeat(64)}.zip`,
    );
  });

  it("computes the CRC64 value returned by Tencent COS", () => {
    expect(calculateCosCrc64Ecma(Buffer.from("123456789"))).toBe("11051210869376104954");
  });

  it("signs downloads for the actual COS host and accepts a custom domain only after explicit verification", () => {
    const file = {
      fileName: "工作流.zip",
      filePath: "cos://enhe-downloads-1303691623/ai-workflows/123456/version/hash.zip",
      storageBucket: "enhe-downloads-1303691623",
      objectKey: "ai-workflows/123456/version/hash.zip",
    };
    const env = {
      COS_SECRET_ID: "test-id",
      COS_SECRET_KEY: "test-key",
      COS_DOWNLOAD_BASE_URL: "https://download.enhe-tech.com.cn",
    };
    const defaultHostUrl = getAiWorkflowDownloadUrl(file, env);
    expect(new URL(defaultHostUrl).hostname).toBe("enhe-downloads-1303691623.cos.ap-shanghai.myqcloud.com");

    const verifiedCustomUrl = getAiWorkflowDownloadUrl(file, { ...env, COS_DOWNLOAD_DOMAIN_VERIFIED: "true" });
    expect(new URL(verifiedCustomUrl).hostname).toBe("download.enhe-tech.com.cn");
  });

  it("refuses to sign a file whose path, bucket, and object key disagree", () => {
    expect(() => getAiWorkflowDownloadUrl({
      fileName: "workflow.zip",
      filePath: "cos://legacy-bucket-1303691623/ai-workflows/repository/commit/hash.zip",
      storageBucket: "enhe-downloads-1303691623",
      objectKey: "ai-workflows/repository/commit/hash.zip",
    }, { COS_SECRET_ID: "test-id", COS_SECRET_KEY: "test-key" })).toThrow();
  });

  it("reports only safe COS failure metadata and classifies the error without exposing its message", () => {
    const failure = getAiWorkflowCosOperationFailure({
      statusCode: 403,
      code: "Error",
      message: "Access Denied for token=must-not-leak",
      RequestId: "request-123",
    }, "enhe-downloads-1303691623", "ai-workflows/123/commit/archive.zip");

    expect(failure).toEqual({
      operation: "ai_workflow_cos",
      bucket: "enhe-downloads-1303691623",
      prefix: "ai-workflows/123",
      statusCode: 403,
      code: "AccessDenied",
      requestId: "request-123",
    });
    expect(JSON.stringify(failure)).not.toContain("must-not-leak");
  });

  it("keeps the underlying COS failure type and stage when errors are wrapped", () => {
    const transportError = Object.assign(new Error("connect ETIMEDOUT cos.ap-shanghai.myqcloud.com"), {
      code: "ETIMEDOUT",
    });
    const wrappedError = Object.assign(new Error("AI Workflow COS operation failed."), {
      aiWorkflowStage: "upload_archive",
      cause: transportError,
    });

    const failure = getAiWorkflowCosOperationFailure(
      wrappedError,
      "enhe-downloads-1303691623",
      "ai-workflows/123/commit/archive.zip",
    );

    expect(failure).toMatchObject({
      statusCode: 0,
      code: "NetworkTimeout",
      cosStage: "upload_archive",
    });
    expect(JSON.stringify(failure)).not.toContain("cos.ap-shanghai.myqcloud.com");
  });
});
