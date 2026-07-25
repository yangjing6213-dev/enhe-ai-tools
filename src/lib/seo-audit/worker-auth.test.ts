import { describe, expect, it } from "vitest";
import {
  readBoundedJsonBody,
  verifyWorkerAuthorization,
} from "@/lib/seo-audit/worker-auth";

const workerEnv = {
  AUDIT_WORKER_TOKEN_CURRENT: "current-worker-token-1234567890",
  AUDIT_WORKER_TOKEN_PREVIOUS: "previous-worker-token-123456789",
};

describe("SEO audit worker authentication", () => {
  it("accepts the current and previous bearer tokens during rotation", () => {
    expect(
      verifyWorkerAuthorization(
        "Bearer current-worker-token-1234567890",
        workerEnv,
      ),
    ).toBe(true);
    expect(
      verifyWorkerAuthorization(
        "Bearer previous-worker-token-123456789",
        workerEnv,
      ),
    ).toBe(true);
  });

  it.each([
    null,
    "",
    "current-worker-token-1234567890",
    "bearer current-worker-token-1234567890",
    "Bearer",
    "Bearer  current-worker-token-1234567890",
    "Bearer wrong-worker-token-1234567890",
    "Bearer current-worker-token-1234567890 trailing",
  ])("rejects missing, malformed, or wrong credentials uniformly", (header) => {
    expect(verifyWorkerAuthorization(header, workerEnv)).toBe(false);
  });

  it("fails closed when no current worker token is configured", () => {
    expect(
      verifyWorkerAuthorization("Bearer previous-worker-token-123456789", {
        AUDIT_WORKER_TOKEN_PREVIOUS: "previous-worker-token-123456789",
      }),
    ).toBe(false);
  });

  it("does not include either configured token in its result", () => {
    const result = verifyWorkerAuthorization(
      "Bearer wrong-worker-token-1234567890",
      workerEnv,
    );

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(workerEnv.AUDIT_WORKER_TOKEN_CURRENT);
    expect(serialized).not.toContain(workerEnv.AUDIT_WORKER_TOKEN_PREVIOUS);
  });
});

describe("bounded worker JSON bodies", () => {
  it("parses a JSON request within the byte limit", async () => {
    const request = new Request("http://localhost/internal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workerId: "worker-1" }),
    });

    await expect(readBoundedJsonBody(request, 1024)).resolves.toEqual({
      workerId: "worker-1",
    });
  });

  it("rejects non-JSON, malformed JSON, and streamed bodies over the limit", async () => {
    const textRequest = new Request("http://localhost/internal", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });
    const malformedRequest = new Request("http://localhost/internal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    const oversizedRequest = new Request("http://localhost/internal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(128) }),
    });

    await expect(readBoundedJsonBody(textRequest, 1024)).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
    await expect(
      readBoundedJsonBody(malformedRequest, 1024),
    ).rejects.toMatchObject({ code: "INVALID_JSON" });
    await expect(
      readBoundedJsonBody(oversizedRequest, 32),
    ).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });
});
