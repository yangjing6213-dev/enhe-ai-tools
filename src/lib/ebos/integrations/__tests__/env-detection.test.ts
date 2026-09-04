import { describe, expect, test } from "vitest";
import { checkEnvPresence, maskEnvKeyName } from "../env-detection";

describe("env detection", () => {
  test("detects presence without returning env values", () => {
    const results = checkEnvPresence(["GOOGLE_SERVICE_ACCOUNT_EMAIL", "CLOUDFLARE_API_TOKEN"], {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "secret@example.com"
    });

    expect(results).toEqual([
      {
        key: "GOOGLE_SERVICE_ACCOUNT_EMAIL",
        maskedKey: "GOOGLE...EMAIL",
        configured: true
      },
      {
        key: "CLOUDFLARE_API_TOKEN",
        maskedKey: "CLOUDFLARE...TOKEN",
        configured: false
      }
    ]);
    expect(JSON.stringify(results)).not.toContain("secret@example.com");
  });

  test("masks short and long env key names deterministically", () => {
    expect(maskEnvKeyName("GA_PROPERTY_ID")).toBe("GA...ID");
    expect(maskEnvKeyName("TOKEN")).toBe("TOKEN");
  });
});
