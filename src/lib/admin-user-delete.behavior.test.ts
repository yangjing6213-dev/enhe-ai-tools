import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { deleteUserForAdmin } from "./admin-delete";
import type { AdminUserProtectedCounts } from "./admin-delete-protection";

const emptyCounts: AdminUserProtectedCounts = {
  orders: 0, memberships: 0, paymentProofs: 0, reviewedProofs: 0, comments: 0, downloadLogs: 0, toolUsageLogs: 0, analyticsEvents: 0, toolPurchases: 0, vipAdjustments: 0, vipOperations: 0, refundRecords: 0, refundRequests: 0, adminAuditLogs: 0, sessions: 0, notifications: 0, newsFavorites: 0, newsLikes: 0, forumPosts: 0, forumReplies: 0, forumLikes: 0, forumReports: 0, seoAuditProjects: 0, seoAuditRuns: 0, seoAuditCredits: 0, seoAuditSubscriptions: 0,
};
const tx = {
  $queryRaw: vi.fn(), $executeRawUnsafe: vi.fn(),
  user: { findUnique: vi.fn(), count: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
  adminAuditLog: { create: vi.fn() },
};
const db = { $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) } as unknown as PrismaClient;
const user = { id: "empty-user", email: null, phone: null, nickname: "Example", role: "user", status: "active", isTestData: false, _count: { ...emptyCounts, sessions: 2, analyticsEvents: 2 } };
const input = { db, adminId: "admin-1", userId: user.id, auditContext: {} };

describe("admin user deletion transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: user.id }]);
    tx.user.findUnique.mockResolvedValue(user);
    tx.user.count.mockResolvedValue(2);
    tx.user.deleteMany.mockResolvedValue({ count: 1 });
  });
  it("deletes a normal empty registration account and records the operation", async () => {
    expect(await deleteUserForAdmin(input)).toEqual({ status: "deleted", userId: user.id });
    expect(tx.user.deleteMany).toHaveBeenCalledWith({ where: { id: user.id } });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "user.delete", targetId: user.id, adminId: "admin-1" }) });
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it.each(["orders", "memberships", "toolPurchases", "refundRecords", "seoAuditRuns", "adminAuditLogs"] as const)("protects users with %s and keeps deletion blocked", async field => {
    tx.user.findUnique.mockResolvedValue({ ...user, _count: { ...user._count, [field]: 1 } });
    expect(await deleteUserForAdmin(input)).toEqual({ status: "blocked", code: "ADMIN_USER_DELETE_PROTECTED_RECORDS", disabled: true });
    expect(tx.user.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: user.id }, data: { status: "disabled" } });
  });
  it("does not delete the currently signed-in administrator", async () => {
    expect((await deleteUserForAdmin({ ...input, adminId: user.id })).status).toBe("rule_blocked");
    expect(tx.user.deleteMany).not.toHaveBeenCalled();
  });
  it("does not delete the last administrator", async () => {
    tx.user.findUnique.mockResolvedValue({ ...user, role: "admin" });
    tx.user.count.mockResolvedValue(0);
    expect((await deleteUserForAdmin(input)).status).toBe("rule_blocked");
    expect(tx.user.deleteMany).not.toHaveBeenCalled();
  });
  it("rolls back concurrent dependency conflicts and disables instead of deleting", async () => {
    tx.user.deleteMany.mockRejectedValueOnce({ code: "P2003" });
    expect(await deleteUserForAdmin(input)).toEqual({ status: "blocked", code: "ADMIN_DELETE_CONFLICT", disabled: true });
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith("ROLLBACK TO SAVEPOINT admin_user_delete");
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "user.delete.protected_disabled" }) });
  });
});
