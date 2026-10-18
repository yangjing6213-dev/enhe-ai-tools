import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ order: vi.fn(), save: vi.fn(), upsert: vi.fn(), update: vi.fn(), transaction: vi.fn(), email: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: async () => ({ id: "owner" }) }));
vi.mock("@/lib/db", () => ({ prisma: { order: { findFirst: mocks.order, update: mocks.update }, paymentProof: { upsert: mocks.upsert }, $transaction: mocks.transaction } }));
vi.mock("@/lib/storage", () => ({ saveUploadedFile: mocks.save }));
vi.mock("@/lib/admin-email-notifications", () => ({ sendPaymentProofSubmittedAdminEmail: mocks.email }));
import { POST } from "./route";

describe("payment proof private upload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.order.mockResolvedValue({ id: "order-1", orderStatus: "pending_payment" });
    mocks.save.mockResolvedValue({ storage: "local", filePath: "private-uploads/payment-proofs/proof.png", fileUrl: "" });
    mocks.email.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  const request = () => {
    const data = new FormData();
    data.set("orderId", "order-1"); data.set("paymentMethod", "wechat");
    data.set("file", new File(["fixture"], "proof.png", { type: "image/png" }));
    return new Request("https://site.example/api/uploads/payment-proof", { method: "POST", body: data });
  };
  it("uses explicit private ACL/storage and saves the private path", async () => {
    expect((await POST(request())).status).toBe(303);
    expect(mocks.save).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ access: "private" }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ proofImage: "private-uploads/payment-proofs/proof.png" }),
      update: expect.objectContaining({ proofImage: "private-uploads/payment-proofs/proof.png" })
    }));
  });
  it("does not store a proof when the order is not owned by the uploader", async () => {
    mocks.order.mockResolvedValue(null);
    await POST(request());
    expect(mocks.order).toHaveBeenCalledWith({ where: { id: "order-1", userId: "owner" } });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it("notifies the administrator once only after the proof transaction commits", async () => {
    let commit: () => void = () => undefined;
    const committed = new Promise<void>((resolve) => { commit = resolve; });
    mocks.transaction.mockReturnValue(committed);
    const pending = POST(request());
    await vi.waitFor(() => expect(mocks.transaction).toHaveBeenCalledOnce());
    expect(mocks.email).not.toHaveBeenCalled();
    commit();
    expect((await pending).status).toBe(303);
    expect(mocks.email).toHaveBeenCalledExactlyOnceWith("order-1");
  });
  it("never sends a submitted notification when the transaction fails", async () => {
    mocks.transaction.mockRejectedValue(new Error("database failure"));
    await expect(POST(request())).rejects.toThrow("database failure");
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it("keeps the successful upload when the administrator notification fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.email.mockRejectedValue(new Error("mail unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("uploaded=1");
    expect(mocks.email).toHaveBeenCalledOnce();
  });
  it("bounds email waiting so slow SMTP cannot keep the completed upload pending", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("ADMIN_EMAIL_ACTION_WAIT_MS", "25");
    mocks.email.mockReturnValue(new Promise<void>(() => undefined));
    vi.useFakeTimers();
    const pending = POST(request());
    await vi.waitFor(() => expect(mocks.email).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(25);
    expect((await pending).status).toBe(303);
  });
});
