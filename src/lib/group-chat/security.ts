import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAuthSecret } from "@/lib/auth-security";

function inviteKey() {
  return createHmac("sha256", "enhe-group-invite-key-v1").update(getAuthSecret()).digest();
}

export function createChatInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashChatInviteToken(token: string) {
  return createHmac("sha256", inviteKey()).update(token).digest("hex");
}

export function encryptChatInviteToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", inviteKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptChatInviteToken(value: string) {
  const [ivValue, tagValue, encryptedValue, extra] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue || extra) throw new Error("CHAT_INVITE_SECRET_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", inviteKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function verifyChatInviteToken(token: string, expectedHash: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token) || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const actual = Buffer.from(hashChatInviteToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
