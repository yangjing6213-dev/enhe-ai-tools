import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), proof: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/db", () => ({ prisma: { paymentProof: { findUnique: mocks.proof } } }));
vi.mock("@/lib/storage", async (original) => ({
  ...await original<typeof import("@/lib/storage")>(), getSecureFileDownloadUrl: mocks.sign
}));
import { GET } from "./route";

describe("private payment proof read authorization", () => {
  let directory: string;
  beforeEach(async () => {
    vi.resetAllMocks();
    directory = await mkdtemp(join(tmpdir(), "enhe-proof-test-"));
    await mkdir(join(directory, "payment-proofs"));
    vi.stubEnv("PRIVATE_UPLOAD_DIR", directory);
    vi.stubEnv("TENCENT_COS_BUCKET", "bucket");
    mocks.user.mockResolvedValue({ id: "owner", role: "user" });
    mocks.sign.mockResolvedValue(new URL("https://cos.example/proof.png?signed=fixture"));
  });
  afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
  const read = () => GET(new Request("https://site.example/api/payment-proofs/proof-1/image"), { params: Promise.resolve({ id: "proof-1" }) });

  it("streams a private local image for its owner with private cache headers", async () => {
    const file = join(directory, "payment-proofs", "proof.png");
    await writeFile(file, "synthetic-proof");
    mocks.proof.mockResolvedValue({ userId: "owner", proofImage: file });
    const response = await read();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("synthetic-proof");
  });
  it("refuses another user's proof before any object is signed", async () => {
    mocks.proof.mockResolvedValue({ userId: "other-user", proofImage: "cos://bucket/payment-proofs/proof.png" });
    expect((await read()).status).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("does not read another private upload namespace from a legacy proof reference", async () => {
    const file = join(directory, "forum-attachment.png");
    await writeFile(file, "not-a-payment-proof");
    mocks.proof.mockResolvedValue({ userId: "owner", proofImage: file });
    expect((await read()).status).toBe(404);
  });
  it("allows an administrator to read a proof with no shared cache", async () => {
    mocks.user.mockResolvedValue({ id: "admin", role: "admin" });
    mocks.proof.mockResolvedValue({ userId: "other-user", proofImage: "cos://bucket/payment-proofs/proof.png" });
    const response = await read();
    expect(response.status).toBe(307);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it.each(["cos://bucket/ai-skills/paid.zip", "cos://another-bucket/payment-proofs/proof.png", "private-uploads/../secret.txt"])("does not sign or expose a non-proof location: %s", async (proofImage) => {
    mocks.proof.mockResolvedValue({ userId: "owner", proofImage });
    expect((await read()).status).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
