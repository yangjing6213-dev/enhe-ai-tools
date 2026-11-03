import { afterEach, describe, expect, it, vi } from "vitest";
import { createChatInviteToken, decryptChatInviteToken, encryptChatInviteToken, hashChatInviteToken, verifyChatInviteToken } from "@/lib/group-chat/security";

describe("private chat invitation tokens", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates unpredictable tokens that can be looked up without storing them in plaintext", () => {
    vi.stubEnv("AUTH_SECRET", "a-test-auth-secret-that-is-long-enough");
    const first = createChatInviteToken();
    const second = createChatInviteToken();
    const hash = hashChatInviteToken(first);
    expect(first).not.toBe(second);
    expect(hash).not.toContain(first);
    expect(verifyChatInviteToken(first, hash)).toBe(true);
    expect(verifyChatInviteToken(second, hash)).toBe(false);
  });

  it("encrypts the admin-copyable invite token and rejects tampering", () => {
    vi.stubEnv("AUTH_SECRET", "a-test-auth-secret-that-is-long-enough");
    const token = createChatInviteToken();
    const ciphertext = encryptChatInviteToken(token);
    expect(ciphertext).not.toContain(token);
    expect(decryptChatInviteToken(ciphertext)).toBe(token);
    expect(() => decryptChatInviteToken(`${ciphertext}.bad`)).toThrow("CHAT_INVITE_SECRET_INVALID");
  });
});
