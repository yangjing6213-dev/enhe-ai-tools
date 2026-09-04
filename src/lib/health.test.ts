import { describe, expect, it } from "vitest";
import { buildHealthPayload, getHealthStatus } from "@/lib/health";

describe("health helpers", () => {
  it("reports healthy when database check succeeds", async () => {
    const result = await getHealthStatus(async () => true);
    expect(result.status).toBe("ok");
    expect(result.database).toBe("ok");
  });

  it("reports degraded when database check fails", async () => {
    const result = await getHealthStatus(async () => {
      throw new Error("connection refused");
    });
    expect(result.status).toBe("degraded");
    expect(result.database).toBe("error");
  });

  it("builds a stable payload shape", () => {
    const payload = buildHealthPayload({
      status: "ok",
      database: "ok",
      checkedAt: new Date("2026-05-19T10:00:00.000Z")
    });
    expect(payload).toEqual({
      app: "enhe-ai-tools",
      status: "ok",
      database: "ok",
      checkedAt: "2026-05-19T10:00:00.000Z"
    });
  });
});
