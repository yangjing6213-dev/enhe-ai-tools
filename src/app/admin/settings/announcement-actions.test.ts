import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), upsert: vi.fn(), audit: vi.fn(), revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({ prisma: { siteSetting: { upsert: mocks.upsert } } }));
vi.mock("@/lib/admin-audit", () => ({ writeAdminAuditLog: mocks.audit }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag, revalidatePath: mocks.revalidatePath }));
import { saveSiteAnnouncementAction } from "./announcement-actions";

const idle = { status: "idle" as const, message: "" };
function form(href = "/software") {
  const data = new FormData();
  Object.entries({ enabled: "on", zhText: "新工具", enText: "New tools", zhHref: href, enHref: "/en/software" }).forEach(([key, value]) => data.set(key, value));
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
  mocks.upsert.mockResolvedValue({});
  mocks.audit.mockResolvedValue({});
});
describe("announcement settings action", () => {
  it("rejects non-admin callers before saving", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Unauthorized"));
    await expect(saveSiteAnnouncementAction(idle, form())).rejects.toThrow("Unauthorized");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("rejects unsafe links without changing settings", async () => {
    expect((await saveSiteAnnouncementAction(idle, form("javascript:alert(1)"))).status).toBe("error");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("saves both languages, records the administrator and refreshes public settings", async () => {
    expect((await saveSiteAnnouncementAction(idle, form())).status).toBe("success");
    const call = mocks.upsert.mock.calls[0][0];
    expect(JSON.parse(call.update.value)).toEqual({ enabled: true, zhText: "新工具", enText: "New tools", zhHref: "/software", enHref: "/en/software" });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ adminId: "admin-1", action: "site.announcement.update" }));
    expect(mocks.revalidateTag).toHaveBeenCalledWith("site-settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
