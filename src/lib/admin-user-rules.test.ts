import { describe, expect, it } from "vitest";
import { getAdminUserDeleteBlockReason } from "@/lib/admin-user-rules";

describe("admin user deletion rules", () => {
  it("blocks deleting the current admin account", () => {
    expect(
      getAdminUserDeleteBlockReason({
        currentAdminId: "admin-1",
        targetUserId: "admin-1",
        targetRole: "admin",
        remainingAdminCount: 2
      })
    ).toBe("不能删除当前登录的管理员账号。");
  });

  it("blocks deleting the last remaining admin", () => {
    expect(
      getAdminUserDeleteBlockReason({
        currentAdminId: "admin-1",
        targetUserId: "admin-2",
        targetRole: "admin",
        remainingAdminCount: 0
      })
    ).toBe("至少需要保留一个管理员账号。");
  });

  it("allows deleting normal users and non-current admins when another admin remains", () => {
    expect(
      getAdminUserDeleteBlockReason({
        currentAdminId: "admin-1",
        targetUserId: "user-1",
        targetRole: "user",
        remainingAdminCount: 1
      })
    ).toBeNull();
    expect(
      getAdminUserDeleteBlockReason({
        currentAdminId: "admin-1",
        targetUserId: "admin-2",
        targetRole: "admin",
        remainingAdminCount: 1
      })
    ).toBeNull();
  });
});
