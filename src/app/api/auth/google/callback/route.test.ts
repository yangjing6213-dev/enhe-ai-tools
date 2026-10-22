import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), create: vi.fn(), signIn: vi.fn(), verify: vi.fn(), trackEvent: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: mocks.trackEvent }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => name === "test-oauth" ? { value: JSON.stringify({ state: "state", nonce: "nonce", locale: "zh", returnTo: "/user" }) } : undefined,
  set: vi.fn()
}) }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: mocks.find, update: mocks.update, create: mocks.create } } }));
vi.mock("@/lib/auth", () => ({ hashPassword: vi.fn(async () => "random-unusable-password"), signInUser: mocks.signIn }));
vi.mock("@/lib/google-oauth", () => ({
  getGoogleRedirectUri: () => "https://site.example/api/auth/google/callback", googleOAuthStateCookieName: "test-oauth", verifyGoogleIdToken: mocks.verify
}));
import { GET } from "./route";

describe("Google identity ownership", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("GOOGLE_CLIENT_ID", "fixture-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "fixture-secret");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id_token: "fixture-token" })));
    mocks.verify.mockResolvedValue({ subject: "verified-subject", email: "owner@example.com", name: "Owner" });
    mocks.create.mockResolvedValue({ id: "new-google-user" });
    mocks.update.mockResolvedValue({ id: "pre-registered" });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  const request = () => new NextRequest("https://site.example/api/auth/google/callback?state=state&code=fixture");

  it("does not merge a verified Google email into a pre-registered local account", async () => {
    mocks.find.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "pre-registered", status: "active", googleSubject: null });
    const response = await GET(request());
    expect(new URL(response.headers.get("location")!).searchParams.get("message")).toBe("google-account-conflict");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });
  it("continues to authenticate an already linked verified Google subject", async () => {
    mocks.find.mockResolvedValueOnce({ id: "linked-user", status: "active" });
    const response = await GET(request());
    expect(response.headers.get("location")).toBe("https://site.example/user");
    expect(mocks.signIn).toHaveBeenCalledWith("linked-user");
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });
  it("creates a new account when neither identity nor email exists", async () => {
    mocks.find.mockResolvedValue(null);
    await GET(request());
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ googleSubject: "verified-subject" }) }));
    expect(mocks.signIn).toHaveBeenCalledWith("new-google-user");
    expect(mocks.trackEvent).toHaveBeenCalledWith({
      eventName: "registration_completed", path: "/register", entityType: "user",
      entityId: "new-google-user", userId: "new-google-user",
      metadata: { locale: "zh", registrationMethod: "google" },
    });
    expect(JSON.stringify(mocks.trackEvent.mock.calls)).not.toContain("owner@example.com");
    expect(JSON.stringify(mocks.trackEvent.mock.calls)).not.toContain("verified-subject");
  });
  it("authenticates a newly created account even when analytics is unavailable", async () => {
    mocks.find.mockResolvedValue(null);
    mocks.trackEvent.mockRejectedValueOnce(new Error("analytics unavailable"));
    const response = await GET(request());
    expect(response.headers.get("location")).toBe("https://site.example/user");
    expect(mocks.signIn).toHaveBeenCalledWith("new-google-user");
  });
  it("does not count a unique-constraint race resolved to an existing account as another registration", async () => {
    mocks.find.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "raced-user", status: "active" });
    mocks.create.mockRejectedValueOnce({ code: "P2002" });
    await GET(request());
    expect(mocks.signIn).toHaveBeenCalledWith("raced-user");
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });
  it("rejects a disabled linked account", async () => {
    mocks.find.mockResolvedValueOnce({ id: "disabled-user", status: "disabled" });
    await GET(request());
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
