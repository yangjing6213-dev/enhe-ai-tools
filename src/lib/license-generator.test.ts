import { describe, expect, test } from "vitest";
import {
  createLicenseCode,
  isUnlimitedLicenseKeyValid,
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
