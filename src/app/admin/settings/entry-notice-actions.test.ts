import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  audit: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({ prisma: { siteSetting: { findUnique: mocks.findUnique, upsert: mocks.upsert } } }));
vi.mock("@/lib/admin-audit", () => ({ writeAdminAuditLog: mocks.audit }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag, revalidatePath: mocks.revalidatePath }));

import { saveSiteEntryNoticeAction } from "./entry-notice-actions";

const idle = { status: "idle" as const, message: "" };

function form(enabled = true) {
  const data = new FormData();
  data.set("enabled", enabled ? "on" : "off");
  data.set("zhTitle", "本站公告");
  data.set("enTitle", "Site notice");
  data.set("zhBody", "公告正文");
  data.set("enBody", "Announcement body");
  data.set("zhEnding", "联系客服");
  data.set("enEnding", "Contact support");
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
  mocks.findUnique.mockResolvedValue({ value: JSON.stringify({
    enabled: true,
    version: 3,
    zhTitle: "旧标题",
    enTitle: "Old title",
    zhBody: "旧正文",
    enBody: "Old body",
    zhEnding: "旧结尾",
    enEnding: "Old ending",
  }) });
  mocks.upsert.mockResolvedValue({});
  mocks.audit.mockResolvedValue({});
});

describe("site entry notice settings action", () => {
  it("requires an administrator before writing", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Unauthorized"));

    await expect(saveSiteEntryNoticeAction(idle, form())).rejects.toThrow("Unauthorized");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("saves edited copy, advances its revision, audits the change, and refreshes public settings", async () => {
    const result = await saveSiteEntryNoticeAction(idle, form());

    expect(result.status).toBe("success");
    expect(JSON.parse(mocks.upsert.mock.calls[0][0].update.value)).toEqual({
      enabled: true,
      version: 4,
      zhTitle: "本站公告",
      enTitle: "Site notice",
      zhBody: "公告正文",
      enBody: "Announcement body",
      zhEnding: "联系客服",
      enEnding: "Contact support",
    });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      adminId: "admin-1",
      action: "site.entry_notice.update",
      metadata: { enabled: true, version: 4 },
    }));
    expect(mocks.revalidateTag).toHaveBeenCalledWith("site-settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("saves the disabled state instead of publishing the notice", async () => {
    const result = await saveSiteEntryNoticeAction(idle, form(false));

    expect(result.status).toBe("success");
    expect(JSON.parse(mocks.upsert.mock.calls[0][0].update.value).enabled).toBe(false);
  });
});
