import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserCenterPageShell } from "./page-shell";

const mocks = vi.hoisted(() => ({
  orders: vi.fn(), tools: vi.fn(), recovery: vi.fn(), unread: vi.fn(), notifications: vi.fn()
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
  notification: { findMany: mocks.notifications, count: mocks.unread },
  order: { findMany: mocks.orders }, downloadLog: { findMany: async () => [] },
  toolUsageLog: { findMany: async () => [] }, comment: { findMany: async () => [] },
  toolPurchase: { findMany: async () => [{ toolId: "skill-1" }] }, tool: { findMany: mocks.tools },
  user: { findUnique: mocks.recovery }
} }));
vi.mock("@/lib/user-avatar", () => ({ resolveUserAvatarSrc: async () => null }));
vi.mock("@/components/user-avatar", () => ({ UserAvatar: () => <span>Avatar</span> }));
vi.mock("@/components/site-background-music", () => ({ SiteBackgroundMusicCard: () => <div>Background music control</div> }));
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
  mocks.notifications.mockResolvedValue([]);
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

  it("hides every order detail until its card is expanded", async () => {
    mocks.orders.mockResolvedValue([
      { id: "paid-1", orderNo: "PAID-1", amount: 5, orderStatus: "activated", plan: null, tool: skill, paymentProof: null, createdAt: new Date("2026-10-01") },
      { id: "pending-2", orderNo: "PENDING-2", amount: 9.9, orderStatus: "pending_payment", plan: null, tool: skill, paymentProof: null, createdAt: new Date("2026-10-02") },
    ]);
    const html = await render("zh");
    const orderCards = [...html.matchAll(/<details[^>]*user-center-order[^>]*>[\s\S]*?<\/details>/g)].map(([card]) => card);
    expect(orderCards).toHaveLength(2);

    for (const [index, orderCard] of orderCards.entries()) {
      const summary = orderCard.match(/<summary[^>]*>[\s\S]*?<\/summary>/)?.[0] ?? "";
      expect(summary).toContain(`订单 ${index + 1}`);
      expect(summary).toContain("展开订单");
      expect(summary).not.toMatch(/PAID-1|PENDING-2|Owned AI Skill|¥|激活|待付款|2026/);
      expect(orderCard).not.toMatch(/<details[^>]*open/);
    }

    expect(orderCards[0]).toContain("PAID-1");
    expect(orderCards[0]).toContain("Owned AI Skill");
    expect(orderCards[0]).toContain("¥5.00");
    expect(orderCards[0]).toContain('href="/orders/paid-1"');
    expect(orderCards[1]).toContain("PENDING-2");
    expect(orderCards[1]).toContain("待支付");
    expect(orderCards[1]).toContain('href="/orders/pending-2/pay"');
  });

  it("places background music below account settings in the right column", async () => {
    const html = await render("zh");
    expect(html.indexOf('id="orders"')).toBeLessThan(html.indexOf('id="account-security"'));
    expect(html.indexOf('id="account-security"')).toBeLessThan(html.indexOf("Background music control"));
  });

  it("shows the newest three notifications and any older unread notifications", async () => {
    const latest = [1, 2, 3].map((index) => ({
      id: `latest-${index}`, userId: "user-1", senderId: null, type: "general",
      title: `latest-read-${index}`, content: "read", linkUrl: null,
      readAt: new Date("2026-11-20"), createdAt: new Date(`2026-11-${20 - index}`)
    }));
    const olderUnread = {
      id: "unread-old", userId: "user-1", senderId: null, type: "general",
      title: "older-unread-message", content: "unread", linkUrl: null,
      readAt: null, createdAt: new Date("2026-10-01")
    };
    mocks.notifications.mockImplementation(async ({ where, take }: { where: { readAt?: Date | null }; take?: number }) =>
      where.readAt === null ? [olderUnread] : latest.slice(0, take ?? latest.length)
    );
    const html = await render("zh");
    expect(html).toContain("latest-read-1");
    expect(html).toContain("latest-read-2");
    expect(html).toContain("latest-read-3");
    expect(html).toContain("older-unread-message");
    expect(html).not.toContain("older-read-hidden");
    expect(html).toContain("历史消息");
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
