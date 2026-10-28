import { randomUUID } from "node:crypto";
import { PrismaClient, type OrderStatus, type PaymentMethod, type ToolType } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildZpaySignedParams } from "@/lib/zpay";
import type { ZpayConfig } from "@/lib/zpay-config";

const state = vi.hoisted(() => ({ db: null as PrismaClient | null, userId: "" }));
vi.mock("@/lib/db", () => ({ prisma: new Proxy({}, {
  get(_target, property) {
    const db = state.db!;
    const value = Reflect.get(db, property, db);
    return typeof value === "function" ? value.bind(db) : value;
  },
}) }));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => ({ id: state.userId }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));

import { activateOrderFromZpayNotify } from "@/lib/zpay-orders";
import { activateVipForOrder } from "@/lib/membership";
import { updateOrderForAdmin } from "@/lib/admin-order-mutations";
import { assertDownloadAccess } from "@/lib/access";
import { POST as getInstallPrompt } from "@/app/api/tools/[id]/install-prompt/route";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
if (databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(parsed.hostname) || !/(test|codex)/i.test(parsed.pathname)) {
    throw new Error("Paid download tests require an explicit local test database.");
  }
}
const describePostgres = databaseUrl ? describe : describe.skip;
const config: ZpayConfig = {
  mode: "live", apiBase: "https://pay.example.test", pid: "unit-merchant", key: "unit-key",
  defaultType: "wxpay", channelId: "unit-channel", siteUrl: "https://www.enhe-tech.com.cn",
};

describePostgres("paid product acquisition counting with real order locks", () => {
  let db: PrismaClient;
  const users: string[] = [];
  const tools: string[] = [];
  const orders: string[] = [];
  const files: string[] = [];

  beforeAll(() => {
    db = new PrismaClient({ datasourceUrl: databaseUrl, transactionOptions: { maxWait: 10_000, timeout: 30_000 } });
    state.db = db;
  });
  afterAll(async () => {
    if (!db) return;
    await db.adminAuditLog.deleteMany({ where: { targetId: { in: orders } } });
    await db.downloadLog.deleteMany({ where: { toolId: { in: tools } } });
    await db.aiWorkflowVersionPurchase.deleteMany({ where: { orderId: { in: orders } } });
    await db.toolPurchase.deleteMany({ where: { orderId: { in: orders } } });
    await db.paymentTransaction.deleteMany({ where: { orderId: { in: orders } } });
    await db.orderRefundRecord.deleteMany({ where: { orderId: { in: orders } } });
    await db.order.deleteMany({ where: { id: { in: orders } } });
    await db.tool.deleteMany({ where: { id: { in: tools } } });
    await db.file.deleteMany({ where: { id: { in: files } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });

  async function fixture(options: {
    paymentMethod?: PaymentMethod; type?: ToolType; deliveryMode?: string;
    orderStatus?: OrderStatus; isTestData?: boolean; withFile?: boolean;
  } = {}) {
    const user = await db.user.create({ data: { email: `${randomUUID()}@example.test`, passwordHash: "test-only", isTestData: true } });
    users.push(user.id);
    const file = options.withFile ? await db.file.create({ data: { fileName: "fixture.zip", filePath: "https://example.test/fixture.zip" } }) : null;
    if (file) files.push(file.id);
    const tool = await db.tool.create({ data: {
      name: "Local payment fixture", slug: `local-test-${randomUUID()}`, type: options.type ?? "software",
      shortDescription: "Local test", content: "Local test", status: "published",
      downloadCount: 7, isDownloadPaid: true, downloadPrice: 10,
      deliveryMode: options.deliveryMode ?? "link", installPrompt: "Test-only install prompt",
      downloadFileId: file?.id,
    } });
    tools.push(tool.id);
    const order = await db.order.create({ data: {
      orderNo: `LOCAL-COUNT-${randomUUID()}`, userId: user.id, toolId: tool.id,
      toolFileId: file?.id, amount: 10, orderType: "software_download",
      orderStatus: options.orderStatus ?? "pending_payment", paymentMethod: options.paymentMethod ?? "wechat",
      isTestData: options.isTestData ?? false,
    } });
    orders.push(order.id);
    const payload = buildZpaySignedParams({ pid: config.pid, out_trade_no: order.orderNo, money: "10.00",
      type: order.paymentMethod === "alipay" ? "alipay" : "wxpay", trade_no: `local-${order.id}`, trade_status: "TRADE_SUCCESS" }, config.key);
    const notify = () => activateOrderFromZpayNotify(payload, { db, config });
    const count = async () => (await db.tool.findUniqueOrThrow({ where: { id: tool.id } })).downloadCount;
    return { user, tool, order, file, payload, notify, count };
  }

  it.each([
    ["wechat", "link", "software"], ["alipay", "link", "software"],
    ["wechat", "how_to", "software"], ["alipay", "how_to", "software"],
    ["wechat", "link", "ai_skill"], ["alipay", "link", "ai_skill"],
    ["wechat", "link", "ai_workflow"], ["alipay", "link", "ai_workflow"],
  ] as const)("counts %s %s %s payment once despite simultaneous and replayed callbacks", async (paymentMethod, deliveryMode, type) => {
    const f = await fixture({ paymentMethod, deliveryMode, type, withFile: type !== "software" });
    const results = await Promise.all(Array.from({ length: 6 }, f.notify));
    expect(results.every((result) => result.ok)).toBe(true);
    await f.notify();
    expect(await f.count()).toBe(8);
    expect(await db.toolPurchase.count({ where: { orderId: f.order.id } })).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).paidAt).not.toBeNull();
    if (type === "ai_workflow") expect(await db.aiWorkflowVersionPurchase.count({ where: { orderId: f.order.id } })).toBe(1);
    if (deliveryMode === "how_to") {
      state.userId = f.user.id;
      for (let i = 0; i < 2; i += 1) {
        const response = await getInstallPrompt(new Request(`https://example.test/api/tools/${f.tool.id}/install-prompt`, { method: "POST" }), { params: Promise.resolve({ id: f.tool.id }) });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ prompt: "Test-only install prompt" });
      }
      expect(await f.count()).toBe(8);
    }
  });

  it("serializes callback and manual approval without counting twice", async () => {
    const f = await fixture();
    await Promise.all([f.notify(), activateVipForOrder(f.order.id), activateVipForOrder(f.order.id)]);
    expect(await f.count()).toBe(8);
  });

  it("counts separate paid orders for one product without losing concurrent increments", async () => {
    const first = await fixture();
    const second = await fixture();
    await db.order.update({ where: { id: second.order.id }, data: { toolId: first.tool.id } });
    await Promise.all([first.notify(), second.notify()]);
    expect(await first.count()).toBe(9);
  });

  it("counts first manual paid status, but not later activation or reopened order", async () => {
    const f = await fixture();
    const input = { db, orderId: f.order.id, adminId: f.user.id, amount: 10, paymentMethod: "wechat" as const,
      orderStatus: "paid" as const, auditContext: { ip: null, userAgent: null } };
    await Promise.all([updateOrderForAdmin(input), updateOrderForAdmin(input)]);
    await activateVipForOrder(f.order.id);
    await updateOrderForAdmin({ ...input, orderStatus: "pending_review" });
    await activateVipForOrder(f.order.id);
    expect(await f.count()).toBe(8);
  });

  it.each(["refunded", "cancelled", "paid", "activated"] as const)("does not backfill or count a %s historical order", async (orderStatus) => {
    const f = await fixture({ orderStatus });
    await f.notify();
    await f.notify();
    expect(await f.count()).toBe(7);
  });

  it("does not count test orders or invalid payment notices", async () => {
    const testOrder = await fixture({ isTestData: true });
    await testOrder.notify();
    expect(await testOrder.count()).toBe(7);
    const unpaid = await fixture();
    expect(await activateOrderFromZpayNotify({ ...unpaid.payload, money: "0.01" }, { db, config })).toMatchObject({ ok: false });
    expect(await unpaid.count()).toBe(7);
  });

  it("rolls the count back together with failed entitlement activation", async () => {
    const f = await fixture({ type: "ai_workflow" });
    await expect(f.notify()).rejects.toThrow("AI_WORKFLOW_ORDER_MISSING_FILE_VERSION");
    expect(await f.count()).toBe(7);
    expect(await db.paymentTransaction.findUnique({ where: { orderId: f.order.id } })).toBeNull();
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).orderStatus).toBe("pending_payment");
  });

  it("preserves the paid count on repeated download while free downloads still count actual access", async () => {
    const f = await fixture({ withFile: true });
    state.userId = f.user.id;
    await f.notify();
    await assertDownloadAccess(f.tool.id);
    await assertDownloadAccess(f.tool.id);
    expect(await f.count()).toBe(8);
    expect((await db.file.findUniqueOrThrow({ where: { id: f.file!.id } })).downloadCount).toBe(2);
    await db.tool.update({ where: { id: f.tool.id }, data: { isDownloadPaid: false, downloadPrice: 0 } });
    await assertDownloadAccess(f.tool.id);
    expect(await f.count()).toBe(9);
  });
});
