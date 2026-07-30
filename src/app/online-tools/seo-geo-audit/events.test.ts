import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: track }));

import { trackSeoAuditProductEvent } from "./events";

describe("SEO audit product analytics", () => {
  beforeEach(() => {
    track.mockReset();
    track.mockResolvedValue(undefined);
  });

  it("forwards only the commercial seo_audit event names", async () => {
    for (const eventName of [
      "seo_audit_submitted",
      "seo_audit_checkout_started",
      "seo_audit_report_downloaded",
      "seo_audit_recheck_started",
    ] as const) {
      await trackSeoAuditProductEvent({
        eventName,
        path: "/online-tools/seo-geo-audit",
      });
    }

    expect(track.mock.calls.map(([input]) => input.eventName)).toEqual([
      "seo_audit_submitted",
      "seo_audit_checkout_started",
      "seo_audit_report_downloaded",
      "seo_audit_recheck_started",
    ]);
  });
});
