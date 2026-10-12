import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

vi.mock("@/app/actions", () => ({ loginAction: vi.fn() }));
vi.mock("@/lib/csrf", () => ({ getOrCreateCsrfToken: async () => "test-csrf" }));
vi.mock("@/components/form-submit-button", () => ({
  FormSubmitButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

describe("Google login entry", () => {
  it.each([
    ["zh", "使用 Google 账号登录"],
    ["en", "Sign in with Google"],
  ] as const)("offers Google login in %s and preserves the destination", async (locale, label) => {
    const { LoginPageShell } = await import("@/app/(auth)/login/page-shell");
    const html = renderToStaticMarkup(await LoginPageShell({
      forceLocale: locale,
      searchParams: Promise.resolve({ returnTo: "/software/windows-ai" }),
    }));

    expect(html).toContain(label);
    expect(html).toContain('href="/api/auth/google/start?returnTo=%2Fsoftware%2Fwindows-ai"');
  });
});
