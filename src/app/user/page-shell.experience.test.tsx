import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserCenterPageShell } from "./page-shell";

const mocks = vi.hoisted(() => ({
  orders: vi.fn(), tools: vi.fn(), recovery: vi.fn(), unread: vi.fn()
}));
vi.mock("@/app/actions", () => ({
  cancelOrderAction: vi.fn(), changePasswordAction: vi.fn(), logoutAction: vi.fn(),
  markAllNotificationsReadAction: vi.fn(), markNotificationReadAction: vi.fn(),
  updateNewsletterSettingsAction: vi.fn(), updateUserAvatarAction: vi.fn(), updateUserProfileAction: vi.fn()
}));
vi.mock("@/lib/auth", () => ({ requireUser: async () => ({
  id: "user-1", email: "member@example.test", nickname: "Member", role: "user", avatar: null,
  phone: null, acceptEmailUpdates: false, googleSubject: null
}) }));
vi.mock("@/lib/db", () => ({ prisma: {
  notification: { findMany: async () => [], count: mocks.unread },
  order: { findMany: mocks.orders }, downloadLog: { findMany: async () => [] },
  toolUsageLog: { findMany: async () => [] }, comment: { findMany: async () => [] },
  toolPurchase: { findMany: async () => [{ toolId: "skill-1" }] }, tool: { findMany: mocks.tools },
  user: { findUnique: mocks.recovery }
} }));
vi.mock("@/lib/user-avatar", () => ({ resolveUserAvatarSrc: async () => null }));
vi.mock("@/components/user-avatar", () => ({ UserAvatar: () => <span>Avatar</span> }));
vi.mock("@/components/emoji-text", () => ({ EmojiText: ({ text }: { text: string }) => <>{text}</> }));
vi.mock("@/components/form-submit-button", () => ({
  FormSubmitButton: ({ children, className, disabled }: React.PropsWithChildren<{ className?: string; disabled?: boolean }>) =>
    <button type="submit" className={className} disabled={disabled}>{children}</button>
}));
Object.assign(globalThis, { React });

const skill = { id: "skill-1", name: "Owned AI Skill", slug: "owned-skill", type: "ai_skill", isVipRequired: false, isDownloadPaid: true, downloadFileId: "file-1", onlineUrl: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.orders.mockResolvedValue([]);
  mocks.tools.mockImplementation(async ({ where }) => where.OR.some((entry: { type: string }) => entry.type === "ai_skill") ? [skill] : []);
  mocks.recovery.mockResolvedValue({ recoveryEmail: "recovery@example.test", recoveryVerifiedAt: new Date("2026-10-01") });
  mocks.unread.mockResolvedValue(12);
});

async function render(locale: "zh" | "en" = "en") {
  return renderToStaticMarkup(await UserCenterPageShell({ searchParams: Promise.resolve({}), forceLocale: locale }));
}

describe("account center product access and navigation", () => {
  it("includes purchased AI Skills and provides shortcuts to existing account sections", async () => {
    const html = await render();
    expect(html).toContain("Owned AI Skill");
    expect(html).toContain('href="/en/ai-skills/owned-skill"');
    for (const id of ["orders", "purchased-products", "notifications", "account-security"]) {
      expect(html).toContain(`href="#${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
    expect(mocks.unread).toHaveBeenCalledWith({ where: { userId: "user-1", readAt: null } });
  });

  it("does not tell automatically paid customers to submit a missing payment proof", async () => {
    mocks.orders.mockResolvedValue([{ id: "paid-1", orderNo: "PAID-1", amount: 5, orderStatus: "activated", plan: null, tool: skill, paymentProof: null, createdAt: new Date("2026-10-01") }]);
    const html = await render("zh");
    expect(html).not.toContain("未提交");
    expect(html).toContain('href="/orders/paid-1"');
    expect(html).not.toContain('href="/orders/paid-1/pay"');
    expect(html).not.toContain(" 路 ");
  });

  it("keeps real manual review status and existing payment actions", async () => {
    mocks.orders.mockResolvedValue([{ id: "manual-1", orderNo: "MANUAL-1", amount: 5, orderStatus: "pending_review", plan: null, tool: skill, paymentProof: { reviewStatus: "pending" }, createdAt: new Date("2026-10-01") }]);
    const html = await render("zh");
    expect(html).toContain("凭证");
    expect(html).toContain("审核");
    expect(html).not.toContain('href="/orders/manual-1/pay"');
  });

  it("shows the verified recovery state without exposing the recovery address", async () => {
    const html = await render();
    expect(html).toContain("Recovery email verified");
    expect(html).toContain("Manage recovery email");
    expect(html).not.toContain("recovery@example.test");
    expect(html).toContain('href="/en/user/recovery-email"');
  });

  it("offers setup for unverified recovery and useful browsing links for empty purchases", async () => {
    mocks.recovery.mockResolvedValue({ recoveryEmail: null, recoveryVerifiedAt: null });
    mocks.tools.mockResolvedValue([]);
    const html = await render("zh");
    expect(html).toContain("尚未验证找回邮箱");
    expect(html).toContain("设置并验证找回邮箱");
    expect(html).toContain('href="/software"');
    expect(html).toContain('href="/ai-skills"');
  });
});
