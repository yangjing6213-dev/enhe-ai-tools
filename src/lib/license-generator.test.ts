import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, test } from "vitest";
import {
  createLicenseCode,
  createLumiLicenseCode,
  isUnlimitedLicenseKeyValid,
  normalizeLumiMachineCode,
  parseLicenseCode,
  signLicensePayload
} from "@/lib/license-generator";

const issuedAt = "2026-05-26T10:20:30";

describe("license generator", () => {
  test("matches the original Python single-machine signature format", () => {
    const code = signLicensePayload({
      app: "FaceSwap Studio",
      issued_at: issuedAt,
      license_type: "single",
      machine_id: "ABCD-1234-EF56-7890-ABCD-1234",
      note: "demo-note"
    });

    expect(code).toBe(
      "eyJhcHAiOiJGYWNlU3dhcCBTdHVkaW8iLCJpc3N1ZWRfYXQiOiIyMDI2LTA1LTI2VDEwOjIwOjMwIiwibGljZW5zZV90eXBlIjoic2luZ2xlIiwibWFjaGluZV9pZCI6IkFCQ0QtMTIzNC1FRjU2LTc4OTAtQUJDRC0xMjM0Iiwibm90ZSI6ImRlbW8tbm90ZSJ9.SOeryXr3wzngWjx24OzMxy0FKfeKcGryxTCoxMICsQM"
    );
  });

  test("matches the original Python unlimited signature format", () => {
    const code = signLicensePayload({
      app: "FaceSwap Studio",
      issued_at: issuedAt,
      license_type: "unlimited",
      note: "forever"
    });

    expect(code).toBe(
      "eyJhcHAiOiJGYWNlU3dhcCBTdHVkaW8iLCJpc3N1ZWRfYXQiOiIyMDI2LTA1LTI2VDEwOjIwOjMwIiwibGljZW5zZV90eXBlIjoidW5saW1pdGVkIiwibm90ZSI6ImZvcmV2ZXIifQ.K52Vr82o1VQmjsARNMAOn79-kTPhY-oIaVF_iXsN7_M"
    );
  });

  test("creates a single-machine code with trimmed uppercase machine id", () => {
    const code = createLicenseCode({
      licenseType: "single",
      machineId: " abcd-1234 ",
      note: "customer-a",
      issuedAt
    });

    const parsed = parseLicenseCode(code);
    expect(parsed.error).toBe("");
    expect(parsed.payload).toMatchObject({
      app: "FaceSwap Studio",
      license_type: "single",
      machine_id: "ABCD-1234",
      note: "customer-a"
    });
  });

  test("keeps the desktop generator validation rules", () => {
    expect(() => createLicenseCode({ licenseType: "single", machineId: "", issuedAt })).toThrow("单机授权码需要机器码。");
    expect(() => createLicenseCode({ licenseType: "trial" as never, issuedAt })).toThrow("授权类型不正确。");
    expect(isUnlimitedLicenseKeyValid("Qwe28043124.")).toBe(true);
    expect(isUnlimitedLicenseKeyValid("wrong-key")).toBe(false);
  });
});
const lumiKeyPair = generateKeyPairSync("ed25519");
const lumiPrivateKey = lumiKeyPair.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const lumiPublicKey = lumiKeyPair.publicKey.export({ format: "pem", type: "spki" }).toString();

function parseLumiCode(code: string) {
  const [payloadSegment, signatureSegment] = code.slice("LUMI1-".length).split(".");
  const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8"));
  const ok = verify(null, Buffer.from(payloadSegment, "utf8"), createPublicKey(lumiPublicKey), Buffer.from(signatureSegment, "base64url"));
  return { payload, ok };
}

describe("Lumi OS license generator", () => {
  test("normalizes Lumi OS machine codes", () => {
    expect(normalizeLumiMachineCode(" lumi_win_abcde12345 ")).toBe("LUMI-WIN-ABCDE12345");
  });

  test("creates Lumi OS Ed25519 license codes compatible with Lumi OS 3.0.5", () => {
    const code = createLumiLicenseCode({
      machineCode: " lumi_win_abcde12345 ",
      licenseId: "LIC-WEB-001",
      issuedAt: "2026-06-24T00:00:00.000Z",
      privateKeyPem: lumiPrivateKey
    });

    expect(code.startsWith("LUMI1-")).toBe(true);
    const parsed = parseLumiCode(code);
    expect(parsed.ok).toBe(true);
    expect(parsed.payload).toEqual({
      v: 1,
      product: "lumi-os",
      machineCode: "LUMI-WIN-ABCDE12345",
      licenseId: "LIC-WEB-001",
      issuedAt: "2026-06-24T00:00:00.000Z",
      edition: "windows"
    });
  });

  test("creates expiring Lumi OS license codes when expiry is provided", () => {
    const code = createLumiLicenseCode({
      machineCode: "LUMI-WIN-ABCDE12345",
      licenseId: "LIC-WEB-EXP",
      issuedAt: "2026-06-24T00:00:00.000Z",
      expiresAt: "2027-06-24T00:00:00.000Z",
      privateKeyPem: lumiPrivateKey
    });

    const parsed = parseLumiCode(code);
    expect(parsed.ok).toBe(true);
    expect(parsed.payload.expiresAt).toBe("2027-06-24T00:00:00.000Z");
  });

  test("normalizes date-only Lumi OS expiry values to the end of the UTC day", () => {
    const code = createLumiLicenseCode({
      machineCode: "LUMI-WIN-ABCDE12345",
      issuedAt: "2026-06-24T00:00:00.000Z",
      expiresAt: "2027-06-24",
      privateKeyPem: lumiPrivateKey
    });

    const parsed = parseLumiCode(code);
    expect(parsed.payload.expiresAt).toBe("2027-06-24T23:59:59.999Z");
  });

  test("rejects invalid Lumi OS expiry values before signing", () => {
    expect(() => createLumiLicenseCode({
      machineCode: "LUMI-WIN-ABCDE12345",
      expiresAt: "not-a-date",
      privateKeyPem: lumiPrivateKey
    })).toThrow("Lumi OS 授权到期时间格式不正确。");
  });
});
