import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), findSession: vi.fn(), updateSession: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: mocks.cookies, headers: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { session: { findFirst: mocks.findSession, update: mocks.updateSession } } }));

import { getCurrentUser } from "./auth";
import { hashSessionToken, signSessionCookieValue } from "./auth-security";

describe("authentication session boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const token = "handoff-ticket-token";
    const sessionId = "zpay_return:order-1:nonce";
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: signSessionCookieValue(sessionId, token, "development-auth-secret") })),
    });
    mocks.findSession.mockResolvedValue({
      id: sessionId,
      userId: "user-1",
      tokenHash: hashSessionToken(token),
      userAgent: null,
      user: {
        status: "active",
        id: "user-1",
        email: "buyer@example.test",
        phone: null,
        nickname: "Buyer",
        avatar: null,
        role: "user",
        createdAt: new Date(),
        newsletterEmail: null,
        acceptEmailUpdates: false,
        googleSubject: null,
      },
    });
  });

  it("does not accept a payment-return ticket itself as a normal login session", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });
});
