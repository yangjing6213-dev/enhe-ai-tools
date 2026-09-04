import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { arch, hostname, networkInterfaces, platform } from "node:os";

export const licenseAppId = "FaceSwap Studio";
export const defaultLicenseSecret = "FaceSwap-Studio-2026-local-license-key-change-before-release";
const unlimitedAdminKey = "Qwe28043124.";

export type LicenseType = "single" | "unlimited";

export type LicensePayload = {
  app: string;
  license_type: LicenseType;
  issued_at: string;
  note: string;
  machine_id?: string;
};

export type CreateLicenseCodeInput = {
  licenseType: LicenseType;
  machineId?: string | null;
  note?: string | null;
  issuedAt?: string;
};

function getLicenseSecret() {
  return process.env.FACE_SWAP_LICENSE_SECRET ?? defaultLicenseSecret;
}

function b64Encode(data: Buffer | string) {
  return Buffer.from(data).toString("base64url");
}

function b64Decode(data: string) {
  return Buffer.from(data, "base64url");
}

function stableJsonStringify(value: Record<string, unknown>) {
  const sortedEntries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  return `{${sortedEntries.map(([key, entryValue]) => `${JSON.stringify(key)}:${JSON.stringify(entryValue)}`).join(",")}}`;
}

export function formatLocalIsoSeconds(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `T${[pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(":")}`;
}

export function signLicensePayload(payload: LicensePayload) {
  const body = Buffer.from(stableJsonStringify(payload), "utf8");
  const signature = createHmac("sha256", Buffer.from(getLicenseSecret(), "utf8")).update(body).digest();
  return `${b64Encode(body)}.${b64Encode(signature)}`;
}

export function createLicenseCode(input: CreateLicenseCodeInput) {
  const payload: LicensePayload = {
    app: licenseAppId,
    license_type: input.licenseType,
    issued_at: input.issuedAt ?? formatLocalIsoSeconds(),
    note: input.note ?? ""
  };

  if (input.licenseType === "single") {
    const machineId = (input.machineId ?? "").trim().toUpperCase();
    if (!machineId) throw new Error("单机授权码需要机器码。");
    payload.machine_id = machineId;
  } else if (input.licenseType !== "unlimited") {
    throw new Error("授权类型不正确。");
  }

  return signLicensePayload(payload);
}

export function parseLicenseCode(code: string): { payload: LicensePayload | null; error: string } {
  let body: Buffer;
  let signature: Buffer;
  try {
    const [bodyText, signatureText] = code.trim().split(".", 2);
    if (!bodyText || !signatureText) throw new Error("Invalid license code");
    body = b64Decode(bodyText);
    signature = b64Decode(signatureText);
  } catch {
    return { payload: null, error: "授权码格式不正确。" };
  }

  const expected = createHmac("sha256", Buffer.from(getLicenseSecret(), "utf8")).update(body).digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
    return { payload: null, error: "授权码签名无效。" };
  }

  try {
    const payload = JSON.parse(body.toString("utf8")) as LicensePayload;
    if (payload.app !== licenseAppId) return { payload: null, error: "授权码不属于当前软件。" };
    if (payload.license_type !== "single" && payload.license_type !== "unlimited") {
      return { payload: null, error: "授权码类型不正确。" };
    }
    return { payload, error: "" };
  } catch {
    return { payload: null, error: "授权码内容无法读取。" };
  }
}

function getMacNodeValue() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (!address.internal && address.mac && address.mac !== "00:00:00:00:00:00") {
        return BigInt(`0x${address.mac.replaceAll(":", "")}`).toString();
      }
    }
  }
  return "";
}

export function getServerMachineId() {
  const parts = [
    hostname(),
    platform(),
    arch(),
    process.env.COMPUTERNAME ?? "",
    process.env.PROCESSOR_IDENTIFIER ?? "",
    getMacNodeValue()
  ];
  const digest = createHash("sha256").update(parts.join("|"), "utf8").digest("hex").toUpperCase();
  return Array.from({ length: 6 }, (_, index) => digest.slice(index * 4, index * 4 + 4)).join("-");
}

export function isUnlimitedLicenseKeyValid(key: string | null | undefined) {
  return (key ?? "") === unlimitedAdminKey;
}
