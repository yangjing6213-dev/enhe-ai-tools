import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  findSubscription: vi.fn(),
  getCurrentUser: vi.fn(),
  updateSchedule: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: routeMocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    seoAuditSubscription: {
      findFirst: routeMocks.findSubscription,
    },
  },
}));

vi.mock("@/lib/seo-audit/schedules", () => ({
  updateOwnedSeoAuditSchedule: routeMocks.updateSchedule,
}));

import { GET as getSubscription } from "@/app/api/seo-audit/subscription/route";
import { PATCH as updateSchedule } from "@/app/api/seo-audit/subscription/schedule/route";
import { buildSeoAuditDiff } from "@/lib/seo-audit/diff";

function snapshot(
  overrides: Partial<Parameters<typeof buildSeoAuditDiff>[0]> = {},
) {
  return {
    projectId: "project-1",
    engineVersion: "1.4.8",
    score: 80,
    evidenceCoverage: 75,
    findingIds: ["F001", "F002", "F003"],
    ...overrides,
  };
}

describe("SEO audit history differences", () => {
  it("computes current-minus-previous deltas and finding changes", () => {
    const previous = snapshot();
    const current = snapshot({
      engineVersion: "1.5.0",
      score: 86,
      evidenceCoverage: 82,
      findingIds: ["F002", "F003", "F004", "F004"],
    });

    expect(buildSeoAuditDiff(previous, current)).toEqual({
      scoreDelta: 6,
      evidenceCoverageDelta: 7,
      newFindingIds: ["F004"],
      resolvedFindingIds: ["F001"],
      unchangedFindingIds: ["F002", "F003"],
    });
  });

  it("rejects reports from different projects", () => {
    expect(() =>
      buildSeoAuditDiff(snapshot(), snapshot({ projectId: "project-2" })),
    ).toThrowError(
      expect.objectContaining({ code: "SEO_AUDIT_DIFF_PROJECT_MISMATCH" }),
    );
  });

  it("rejects reports from different or invalid engine majors", () => {
    for (const engineVersion of ["2.0.0", "unknown"]) {
      expect(() =>
        buildSeoAuditDiff(snapshot(), snapshot({ engineVersion })),
      ).toThrowError(
        expect.objectContaining({
          code: "SEO_AUDIT_DIFF_ENGINE_MAJOR_MISMATCH",
        }),
      );
    }
  });
});

describe("SEO audit subscription API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    routeMocks.updateSchedule.mockResolvedValue({ scheduleId: "schedule-1" });
  });

  it("requires a server-authenticated user before reading a subscription", async () => {
    routeMocks.getCurrentUser.mockResolvedValue(null);

    const response = await getSubscription(
      new Request(
        "https://www.enhe-tech.com.cn/api/seo-audit/subscription?subscriptionId=subscription-1",
      ),
    );

    expect(response.status).toBe(401);
    expect(routeMocks.findSubscription).not.toHaveBeenCalled();
  });

  it("reads one subscription through its authenticated owner and server limits", async () => {
    routeMocks.findSubscription.mockResolvedValue({
      id: "subscription-1",
      status: "active",
      startsAt: new Date("2026-07-27T00:00:00.000Z"),
      expiresAt: new Date("2026-08-26T00:00:00.000Z"),
      maxScheduledRuns: 5,
      scheduledRunsUsed: 1,
      manualRunsRemaining: 2,
      project: { normalizedOrigin: "https://example.com" },
      offer: { pageLimit: 100 },
      schedule: {
        cadence: "weekly",
        weekday: 2,
        hour: 3,
        minute: 0,
        timeZone: "Asia/Shanghai",
        enabled: true,
        nextRunAt: new Date("2026-07-28T19:00:00.000Z"),
        lastRunAt: null,
      },
    });

    const response = await getSubscription(
      new Request(
        "https://www.enhe-tech.com.cn/api/seo-audit/subscription?subscriptionId=subscription-1",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(routeMocks.findSubscription).toHaveBeenCalledWith({
      where: { id: "subscription-1", userId: "user-1" },
      select: expect.objectContaining({
        project: { select: { normalizedOrigin: true } },
        offer: { select: { pageLimit: true } },
      }),
    });
    expect(payload.subscription).toMatchObject({
      id: "subscription-1",
      project: { normalizedOrigin: "https://example.com" },
      offer: { pageLimit: 100 },
    });
    expect(JSON.stringify(payload)).not.toContain("userId");
  });

  it("rejects client-supplied target or page-limit selectors", async () => {
    const response = await getSubscription(
      new Request(
        "https://www.enhe-tech.com.cn/api/seo-audit/subscription?subscriptionId=subscription-1&pageLimit=300",
      ),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.findSubscription).not.toHaveBeenCalled();
  });

  it("updates only schedule fields under the authenticated owner", async () => {
    const response = await updateSchedule(
      scheduleRequest({
        subscriptionId: "subscription-1",
        cadence: "biweekly",
        weekday: 4,
        hour: 8,
        enabled: false,
        notificationEmail: "alerts@example.com",
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.updateSchedule).toHaveBeenCalledWith({
      userId: "user-1",
      subscriptionId: "subscription-1",
      schedule: {
        cadence: "biweekly",
        weekday: 4,
        hour: 8,
        minute: 0,
        enabled: false,
        notificationEmail: "alerts@example.com",
      },
    });
  });

  it("requires a server-authenticated user before updating a schedule", async () => {
    routeMocks.getCurrentUser.mockResolvedValue(null);

    const response = await updateSchedule(
      scheduleRequest({
        subscriptionId: "subscription-1",
        cadence: "weekly",
        weekday: 1,
        hour: 19,
        enabled: true,
      }),
    );

    expect(response.status).toBe(401);
    expect(routeMocks.updateSchedule).not.toHaveBeenCalled();
  });

  it("rejects foreign origins and client-supplied monitoring limits", async () => {
    const foreign = await updateSchedule(
      scheduleRequest(
        {
          subscriptionId: "subscription-1",
          cadence: "weekly",
          weekday: 1,
          hour: 19,
          enabled: true,
        },
        { origin: "https://attacker.example" },
      ),
    );
    const extraLimit = await updateSchedule(
      scheduleRequest({
        subscriptionId: "subscription-1",
        cadence: "weekly",
        weekday: 1,
        hour: 19,
        enabled: true,
        pageLimit: 300,
      }),
    );

    expect(foreign.status).toBe(403);
    expect(extraLimit.status).toBe(400);
    expect(routeMocks.updateSchedule).not.toHaveBeenCalled();
  });
});

function scheduleRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return new Request(
    "https://www.enhe-tech.com.cn/api/seo-audit/subscription/schedule",
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "https://www.enhe-tech.com.cn",
        ...headers,
      },
      body: JSON.stringify(body),
    },
  );
}
