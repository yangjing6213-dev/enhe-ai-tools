import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { hashSessionToken, signSessionCookieValue } from "../../src/lib/auth-security";

const enabled = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1" && Boolean(process.env.DATABASE_URL);
test.skip(!enabled, "Requires an explicitly enabled local test database.");
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name) || /(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(name)) {
    throw new Error("Group chat integration checks require a dedicated local test/e2e database.");
  }
}

const db = new PrismaClient();
const prefix = `group-dedup-e2e-${randomUUID()}`;
const adminId = `${prefix}-admin`;
const memberId = `${prefix}-member`;
const groupId = `${prefix}-group`;
const duplicateGroupName = `群聊去重验证 ${prefix}`;
const duplicateGroupDescription = "验证同时从我的群聊和公开列表返回的群只显示一次。";
const message = `群聊站内通知验证 ${prefix}`;
let adminCookie = "";
let memberCookie = "";

test.beforeAll(async () => {
  if (!enabled) return;
  await db.user.create({ data: { id: adminId, nickname: "本地群聊管理员", passwordHash: "unused-test-only", role: "admin", isTestData: true } });
  await db.user.create({ data: { id: memberId, nickname: "本地群聊成员", passwordHash: "unused-test-only", isTestData: true } });
  for (const userId of [adminId, memberId]) {
    const token = randomBytes(32).toString("hex");
    const session = await db.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3_600_000) } });
    const cookie = signSessionCookieValue(session.id, token, process.env.AUTH_SECRET!);
    if (userId === adminId) adminCookie = cookie; else memberCookie = cookie;
  }
  await db.chatGroup.create({ data: {
      id: groupId,
      visibility: "listed",
      ownerId: adminId,
      name: duplicateGroupName,
      description: duplicateGroupDescription,
      rules: "请友好交流。",
      activeMemberCount: 2,
      maxMembers: 200,
      members: { create: [
        { userId: adminId, role: "owner", status: "active" },
        { userId: memberId, role: "member", status: "active" },
      ] },
  } });
});

test.afterAll(async () => {
  if (enabled) {
    try {
      await db.notification.deleteMany({ where: { userId: memberId, senderId: adminId, content: message } });
      await db.chatGroup.deleteMany({ where: { id: groupId } });
      await db.session.deleteMany({ where: { userId: { in: [adminId, memberId] } } });
      await db.user.deleteMany({ where: { id: { in: [adminId, memberId] }, isTestData: true } });
    } finally { await db.$disconnect(); }
  }
});

test("duplicate groups collapse for admins and members, and incoming chat appears in site inbox", async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error("Local test server URL is required.");
  const adminContext = await browser.newContext();
  const memberContext = await browser.newContext();
  try {
    await adminContext.addCookies([{ name: "enhe_session", value: adminCookie, url: baseURL }]);
    const adminPage = await adminContext.newPage();
    for (const mode of ["mine", "discover"]) {
      const source = await adminContext.request.get(`${baseURL}/api/chat/groups?mode=${mode}`);
      expect(source.ok()).toBe(true);
      expect((await source.json()).groups).toContainEqual(expect.objectContaining({ id: groupId, maxMembers: 200 }));
    }
    await adminPage.goto("/chat");
    const adminGroupCard = adminPage.locator(".enhe-chat-card").filter({ has: adminPage.getByRole("heading", { name: duplicateGroupName, exact: true }) });
    await expect(adminGroupCard).toHaveCount(1);
    await expect(adminGroupCard).toContainText("2 / 200 位成员");
    const managerHref = await adminGroupCard.getByRole("link", { name: "管理", exact: true }).getAttribute("href");
    expect(managerHref).toBe(`/chat/${groupId}/manage`);
    await expect(adminPage.getByRole("link", { name: "群组管理", exact: true })).toHaveAttribute("href", "/admin/chat-groups");

    await memberContext.addCookies([{ name: "enhe_session", value: memberCookie, url: baseURL }]);
    const memberPage = await memberContext.newPage();
    await memberPage.goto("/chat");
    const memberGroupCard = memberPage.locator(".enhe-chat-card").filter({ has: memberPage.getByRole("heading", { name: duplicateGroupName, exact: true }) });
    await expect(memberGroupCard).toHaveCount(1);
    await expect(memberGroupCard.getByRole("link", { name: "管理", exact: true })).toHaveCount(0);
    await expect(memberPage.getByRole("link", { name: "群组管理", exact: true })).toHaveCount(0);

    const response = await adminContext.request.post(`${baseURL}/api/chat/groups/${groupId}/messages`, {
      headers: { origin: new URL(baseURL).origin },
      data: { clientMessageId: randomUUID(), text: message, emojiIds: [], mediaIds: [], mentionUserIds: [], mentionEveryone: false },
    });
    expect(response.status(), await response.text()).toBe(201);
    await expect.poll(() => db.notification.count({ where: { userId: memberId, senderId: adminId, type: "chat_group_message", content: message } })).toBe(1);

    await memberPage.goto("/user");
    await expect(memberPage.locator(".user-center-notification").filter({ hasText: message })).toBeVisible();
    const notification = await db.notification.findFirstOrThrow({ where: { userId: memberId, senderId: adminId, type: "chat_group_message", content: message } });
    expect(notification.readAt).toBeNull();
    await adminPage.screenshot({ path: test.info().outputPath("admin-chat-dedup.png"), fullPage: true });
    await memberPage.screenshot({ path: test.info().outputPath("member-chat-notification.png"), fullPage: true });
  } finally {
    await adminContext.close();
    await memberContext.close();
  }
});
