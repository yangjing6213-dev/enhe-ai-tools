import { describe, expect, it } from "vitest";
import { buildUserToolEntitlements } from "@/lib/user-entitlements";

const softwareBase = {
  type: "software" as const,
  downloadFileId: "file-1",
  onlineUrl: null
};

const onlineBase = {
  type: "online" as const,
  downloadFileId: null,
  onlineUrl: "https://example.com"
};

describe("buildUserToolEntitlements", () => {
  it("shows free software downloads without VIP or purchase", () => {
    const tools = [
      { ...softwareBase, id: "legacy-vip-free", name: "Legacy VIP Free", slug: "legacy-vip-free", isVipRequired: true, isDownloadPaid: false }
    ];

    expect(buildUserToolEntitlements({ purchasedToolIds: [], tools }).downloadableSoftware.map((tool) => tool.id)).toEqual(["legacy-vip-free"]);
  });

  it("lists paid software only after that software is purchased", () => {
    const tools = [
      { ...softwareBase, id: "paid-a", name: "Paid A", slug: "paid-a", isVipRequired: true, isDownloadPaid: true },
      { ...softwareBase, id: "paid-b", name: "Paid B", slug: "paid-b", isVipRequired: false, isDownloadPaid: true }
    ];

    const summary = buildUserToolEntitlements({ purchasedToolIds: ["paid-a"], tools });

    expect(summary.purchasedSoftware.map((tool) => tool.id)).toEqual(["paid-a"]);
    expect(summary.downloadableSoftware.map((tool) => tool.id)).toEqual(["paid-a"]);
  });

  it("exposes online tools without VIP gating", () => {
    const tools = [
      { ...onlineBase, id: "legacy-vip-online", name: "Legacy VIP Online", slug: "legacy-vip-online", isVipRequired: true, isDownloadPaid: false },
      { ...onlineBase, id: "free-online", name: "Free Online", slug: "free-online", isVipRequired: false, isDownloadPaid: false },
      { ...onlineBase, id: "missing-url", name: "Missing URL", slug: "missing-url", isVipRequired: false, isDownloadPaid: false, onlineUrl: null }
    ];

    expect(buildUserToolEntitlements({ purchasedToolIds: [], tools }).availableOnlineTools.map((tool) => tool.id)).toEqual(["legacy-vip-online", "free-online"]);
  });
});
