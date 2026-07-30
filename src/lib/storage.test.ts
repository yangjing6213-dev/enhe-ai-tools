import { describe, expect, it } from "vitest";
import {
  createStorageObjectKey,
  defaultAllowedUploadExtensions,
  getAllowedUploadExtensions,
  getCosDeletePlan,
  getCosSignedUrlExpiresSeconds,
  getSecureFileDownloadUrl,
  derivePublicUploadUrlFromFilePath,
  isCosStorageConfigured,
  isRetryableStorageError,
  isUploadExtensionAllowed,
  parseCosFilePath,
  parseCosPublicUrl,
  resolveDeletableLocalUploadPath,
  resolvePrivateLocalUploadPath
} from "@/lib/storage";
import { resolveProductVideoSrc } from "@/lib/product-video";

describe("storage helpers", () => {
  it("detects whether Tencent COS is configured", () => {
    expect(
      isCosStorageConfigured({
        TENCENT_COS_SECRET_ID: "sid",
        TENCENT_COS_SECRET_KEY: "skey",
        TENCENT_COS_BUCKET: "bucket-123",
        TENCENT_COS_REGION: "ap-guangzhou"
      })
    ).toBe(true);

    expect(
      isCosStorageConfigured({
        TENCENT_COS_SECRET_ID: "sid",
        TENCENT_COS_SECRET_KEY: "",
        TENCENT_COS_BUCKET: "bucket-123",
        TENCENT_COS_REGION: "ap-guangzhou"
      })
    ).toBe(false);
  });

  it("creates stable safe object keys with folders", () => {
    expect(createStorageObjectKey("payment-proofs", "付款截图 Final.PNG", () => "fixed")).toBe(
      "payment-proofs/fixed-final.png"
    );
    expect(createStorageObjectKey("", "工具安装包.exe", () => "fixed")).toBe("fixed-file.exe");
  });

  it("parses COS file paths for private object downloads", () => {
    expect(parseCosFilePath("cos://enhe-bucket-123/software/app.zip")).toEqual({
      bucket: "enhe-bucket-123",
      key: "software/app.zip"
    });
    expect(parseCosFilePath("/uploads/app.zip")).toBeNull();
  });

  it("parses configured Tencent COS public URLs for legacy product videos", () => {
    const env = {
      TENCENT_COS_BUCKET: "enhe-ai-tools-1303691623",
      TENCENT_COS_REGION: "ap-shanghai"
    };

    expect(
      parseCosPublicUrl(
        "https://enhe-ai-tools-1303691623.cos.ap-shanghai.myqcloud.com/tool-videos/ai-ai/demo.mp4",
        env
      )
    ).toEqual({
      bucket: "enhe-ai-tools-1303691623",
      key: "tool-videos/ai-ai/demo.mp4"
    });
    expect(parseCosPublicUrl("https://example.com/tool-videos/demo.mp4", env)).toBeNull();
  });

  it("routes private COS product videos through the site proxy", () => {
    const env = {
      TENCENT_COS_BUCKET: "enhe-ai-tools-1303691623",
      TENCENT_COS_REGION: "ap-shanghai"
    };

    expect(resolveProductVideoSrc("cos://enhe-ai-tools-1303691623/tool-videos/demo.mp4", env)).toBe(
      "/api/tool-videos?src=cos%3A%2F%2Fenhe-ai-tools-1303691623%2Ftool-videos%2Fdemo.mp4"
    );
    expect(
      resolveProductVideoSrc(
        "https://enhe-ai-tools-1303691623.cos.ap-shanghai.myqcloud.com/tool-videos/demo.mp4",
        env
      )
    ).toBe(
      "/api/tool-videos?src=https%3A%2F%2Fenhe-ai-tools-1303691623.cos.ap-shanghai.myqcloud.com%2Ftool-videos%2Fdemo.mp4"
    );
    expect(resolveProductVideoSrc("uploads/tool-videos/demo.mp4")).toBe("/api/uploads/tool-videos/demo.mp4");
  });

  it("parses upload extension whitelists and blocks unsafe extensions", () => {
    expect(getAllowedUploadExtensions({ UPLOAD_ALLOWED_EXTENSIONS: ".zip, jpg, .PNG" })).toEqual([".zip", ".jpg", ".png"]);
    expect(isUploadExtensionAllowed("installer.EXE", [".exe"])).toBe(true);
    expect(isUploadExtensionAllowed("shell.php", [".zip", ".png"])).toBe(false);
  });

  it("allows product video upload extensions by default", () => {
    expect(defaultAllowedUploadExtensions).toEqual(expect.arrayContaining([".mp4", ".webm", ".mov"]));
  });

  it("uses local or public URLs unless a COS private file is configured", async () => {
    await expect(
      getSecureFileDownloadUrl(
        { filePath: "C:/uploads/app.zip", fileUrl: "/uploads/app.zip" },
        "http://localhost:3000/api/tools/tool-id/download",
        {}
      )
    ).resolves.toEqual(new URL("http://localhost:3000/uploads/app.zip"));

    await expect(
      getSecureFileDownloadUrl(
        { filePath: "cos://enhe-bucket-123/software/app.zip", fileUrl: "https://public.example/app.zip" },
        "http://localhost:3000/api/tools/tool-id/download",
        {}
      )
    ).resolves.toEqual(new URL("https://public.example/app.zip"));
  });

  it("requires a public URL when COS signing is not available", async () => {
    await expect(
      getSecureFileDownloadUrl(
        { filePath: "cos://enhe-bucket-123/software/app.zip", fileUrl: null },
        "http://localhost:3000/api/tools/tool-id/download",
        {}
      )
    ).rejects.toThrow("Download file URL is missing.");
  });

  it("derives public upload URLs from local upload file paths when fileUrl is missing", async () => {
    const cwd = process.cwd();
    const derived = derivePublicUploadUrlFromFilePath("public\\uploads\\demo-installer.zip", {}, cwd);
    expect(derived).toBe("/uploads/demo-installer.zip");

    await expect(
      getSecureFileDownloadUrl(
        { filePath: "public\\uploads\\demo-installer.zip", fileUrl: null },
        "http://localhost:3000/api/tools/tool-id/download",
        {},
        cwd
      )
    ).resolves.toEqual(new URL("http://localhost:3000/uploads/demo-installer.zip"));
  });

  it("parses signed URL expiry with a safe default", () => {
    expect(getCosSignedUrlExpiresSeconds({ TENCENT_COS_SIGNED_URL_EXPIRES_SECONDS: "900" })).toBe(900);
    expect(getCosSignedUrlExpiresSeconds({ TENCENT_COS_SIGNED_URL_EXPIRES_SECONDS: "-1" })).toBe(600);
    expect(getCosSignedUrlExpiresSeconds({})).toBe(600);
  });

  it("resolves only local upload paths for physical deletion", () => {
    const cwd = process.cwd();
    const env = { UPLOAD_DIR: "public/uploads" };
    expect(resolveDeletableLocalUploadPath("cos://bucket/app.zip", env, cwd)).toBeNull();
    expect(resolveDeletableLocalUploadPath("C:/Windows/system32/app.zip", env, cwd)).toBeNull();
    expect(resolveDeletableLocalUploadPath("/uploads/app.zip", env, cwd)?.replace(/\\/g, "/")).toContain(
      "/public/uploads/app.zip"
    );
  });

  it("resolves private local uploads only from the configured private root", () => {
    const cwd = process.cwd();
    const env = { PRIVATE_UPLOAD_DIR: "private-uploads" };
    expect(
      resolvePrivateLocalUploadPath("private-uploads/ai-skills/skill.zip", env, cwd)?.replace(/\\/g, "/")
    ).toContain("/private-uploads/ai-skills/skill.zip");
    expect(resolvePrivateLocalUploadPath("public/uploads/skill.zip", env, cwd)).toBeNull();
    expect(resolvePrivateLocalUploadPath("C:/Windows/System32/skill.zip", env, cwd)).toBeNull();
    expect(resolvePrivateLocalUploadPath("cos://bucket/ai-skills/skill.zip", env, cwd)).toBeNull();
  });

  it("plans COS remote deletion and reports missing configuration", () => {
    expect(
      getCosDeletePlan("cos://enhe-bucket-123/software/app.zip", {
        TENCENT_COS_SECRET_ID: "sid",
        TENCENT_COS_SECRET_KEY: "skey",
        TENCENT_COS_REGION: "ap-guangzhou"
      })
    ).toEqual({
      storage: "cos",
      canDelete: true,
      bucket: "enhe-bucket-123",
      key: "software/app.zip",
      missingEnvKeys: []
    });

    expect(getCosDeletePlan("cos://enhe-bucket-123/software/app.zip", {})).toMatchObject({
      storage: "cos",
      canDelete: false,
      missingEnvKeys: ["TENCENT_COS_SECRET_ID", "TENCENT_COS_SECRET_KEY", "TENCENT_COS_REGION"]
    });
    expect(getCosDeletePlan("/uploads/app.zip", {})).toEqual({ storage: "local", canDelete: false, missingEnvKeys: [] });
  });

  it("classifies retryable COS errors", () => {
    expect(isRetryableStorageError({ statusCode: 503 })).toBe(true);
    expect(isRetryableStorageError(new Error("socket hang up"))).toBe(true);
    expect(isRetryableStorageError({ statusCode: 403 })).toBe(false);
  });
});
