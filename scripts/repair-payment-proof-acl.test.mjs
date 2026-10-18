import { afterEach, describe, expect, it, vi } from "vitest";
import { aclReportNeedsAttention, anonymousProofAccess, isOwnerOnlyAcl, paymentProofKey, repairPaymentProofAcls } from "./repair-payment-proof-acl.mjs";

const privateAcl = { ACL: "private", Owner: { ID: "fixture-owner" }, Grants: [{ Grantee: { ID: "fixture-owner" }, Permission: "FULL_CONTROL" }] };
const publicAcl = { ...privateAcl, ACL: "public-read", Grants: [...privateAcl.Grants, { Grantee: { URI: "http://cam.qcloud.com/groups/global/AllUsers" }, Permission: "READ" }] };
function fixture() {
  let acl = publicAcl;
  return {
    prisma: { paymentProof: { findMany: vi.fn(async () => [{ proofImage: "cos://bucket/payment-proofs/fixture.png" }]) } },
    cos: {
      getObjectAcl: vi.fn((_params, done) => done(null, acl)),
      putObjectAcl: vi.fn((_params, done) => { acl = privateAcl; done(null, {}); })
    }, bucket: "bucket", region: "region", anonymousHead: vi.fn(async () => "denied")
  };
}
describe("restricted payment ACL maintenance", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(["cos://other/payment-proofs/test.png", "cos://bucket/ai-skills/test.zip", "cos://bucket/payment-proofs/../test.png", "https://attacker.invalid/payment-proofs/test.png"])("rejects out-of-scope source %s", (value) => {
    expect(paymentProofKey(value, "bucket", "region")).toBe(null);
  });
  it("accepts the configured COS namespace and legacy configured HTTPS URL", () => {
    expect(paymentProofKey("cos://bucket/payment-proofs/test.png", "bucket", "region")).toBe("payment-proofs/test.png");
    expect(paymentProofKey("https://bucket.cos.region.myqcloud.com/payment-proofs/test.png", "bucket", "region")).toBe("payment-proofs/test.png");
  });
  it("does not treat extra account grants as owner-only", () => {
    expect(isOwnerOnlyAcl({ ...privateAcl, Grants: [{ Grantee: { ID: "other-account" }, Permission: "READ" }] })).toBe(false);
    expect(isOwnerOnlyAcl(publicAcl)).toBe(false);
    expect(isOwnerOnlyAcl(privateAcl)).toBe(true);
  });
  it("defaults to dry-run and outputs only object hashes", async () => {
    const context = fixture();
    const report = await repairPaymentProofAcls(context);
    expect(report.wouldChange).toBe(1);
    expect(context.cos.putObjectAcl).not.toHaveBeenCalled();
    expect(JSON.stringify(report)).not.toContain("fixture.png");
    expect(JSON.stringify(report)).not.toContain("fixture-owner");
  });
  it("can verify anonymous access during dry-run without writing an ACL", async () => {
    const context = fixture();
    const report = await repairPaymentProofAcls({ ...context, verifyAnonymous: true });
    expect(context.anonymousHead).toHaveBeenCalledTimes(1);
    expect(context.cos.putObjectAcl).not.toHaveBeenCalled();
    expect(report.anonymousDenied).toBe(1);
  });
  it("requires rollback persistence, then applies and verifies the restricted object", async () => {
    const context = fixture();
    const backup = vi.fn(async () => {});
    const report = await repairPaymentProofAcls({ ...context, apply: true, backup });
    expect(backup).toHaveBeenCalledWith(expect.objectContaining({ key: "payment-proofs/fixture.png", acl: expect.objectContaining({ ACL: "public-read" }) }));
    expect(backup.mock.invocationCallOrder[0]).toBeLessThan(context.cos.putObjectAcl.mock.invocationCallOrder[0]);
    expect(context.cos.putObjectAcl).toHaveBeenCalledWith({ Bucket: "bucket", Region: "region", Key: "payment-proofs/fixture.png", ACL: "private" }, expect.any(Function));
    expect(report.verified).toBe(1);
    expect(report.anonymousDenied).toBe(1);
    expect(aclReportNeedsAttention(report)).toBe(false);
  });
  it.each(["public", "unknown"])("does not mark an object protected when anonymous access is %s", async (access) => {
    const context = fixture();
    context.anonymousHead.mockResolvedValue(access);
    const report = await repairPaymentProofAcls({ ...context, apply: true, backup: async () => {} });
    expect(report.verified).toBe(1);
    expect(report.objects[0].anonymous).toBe(access);
    expect(aclReportNeedsAttention(report)).toBe(true);
  });
  it.each([[200, "public"], [403, "denied"], [404, "denied"], [405, "unknown"], [500, "unknown"]])("uses an unsigned HEAD and treats status %s as %s", async (status, expected) => {
    const fetchMock = vi.fn(async () => new Response(null, { status }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await anonymousProofAccess({ bucket: "bucket", region: "region", key: "payment-proofs/proof.png" })).toBe(expected);
    expect(fetchMock).toHaveBeenCalledWith("https://bucket.cos.region.myqcloud.com/payment-proofs/proof.png", expect.objectContaining({ method: "HEAD", redirect: "error" }));
  });
  it("reports a failed anonymous HEAD as unknown rather than denied", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network unavailable"); }));
    expect(await anonymousProofAccess({ bucket: "bucket", region: "region", key: "payment-proofs/proof.png" })).toBe("unknown");
  });
  it("does not mutate an ACL when rollback persistence fails", async () => {
    const context = fixture();
    const report = await repairPaymentProofAcls({ ...context, apply: true, backup: async () => { throw new Error("disk full"); } });
    expect(report.failed).toBe(1);
    expect(context.cos.putObjectAcl).not.toHaveBeenCalled();
  });
});
