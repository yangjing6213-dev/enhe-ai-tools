import { describe, expect, it } from "vitest";
import { getStorageDiagnostics } from "@/lib/storage-diagnostics";

describe("storage diagnostics", () => {
  it("reports local fallback with missing COS environment variables", () => {
    const diagnostics = getStorageDiagnostics({
      TENCENT_COS_SECRET_ID: "sid",
      UPLOAD_ALLOWED_EXTENSIONS: ".zip, exe, .png"
    });

    expect(diagnostics.mode).toBe("local");
    expect(diagnostics.cosConfigured).toBe(false);
    expect(diagnostics.missingCosEnvKeys).toEqual([
      "TENCENT_COS_SECRET_KEY",
      "TENCENT_COS_BUCKET",
      "TENCENT_COS_REGION"
    ]);
    expect(diagnostics.allowedExtensions).toEqual([".zip", ".exe", ".png"]);
    expect(diagnostics.signedUrlExpiresSeconds).toBe(600);
  });

  it("reports COS mode without exposing secrets", () => {
    const diagnostics = getStorageDiagnostics({
      TENCENT_COS_SECRET_ID: "AKIDabcdefghijklmnop",
      TENCENT_COS_SECRET_KEY: "secret",
      TENCENT_COS_BUCKET: "enhe-1250000000",
      TENCENT_COS_REGION: "ap-guangzhou",
      TENCENT_COS_SIGNED_URL_EXPIRES_SECONDS: "900"
    });

    expect(diagnostics.mode).toBe("cos");
    expect(diagnostics.cosConfigured).toBe(true);
    expect(diagnostics.bucket).toBe("enhe-1250000000");
    expect(diagnostics.region).toBe("ap-guangzhou");
    expect(diagnostics.secretIdPreview).toBe("AKID...mnop");
    expect(diagnostics.signedUrlExpiresSeconds).toBe(900);
  });
});
