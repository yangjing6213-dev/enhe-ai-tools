import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RegisterPageShell } from "@/app/(auth)/register/page-shell";

Object.assign(globalThis, { React });

vi.mock("@/app/actions", () => ({ registerAction: vi.fn() }));
vi.mock("@/lib/csrf", () => ({ getOrCreateCsrfToken: vi.fn(async () => "fixture-csrf") }));

describe("registration form copy and required inputs", () => {
  it.each(["zh", "en"] as const)("does not collect an unsaved notification email and preserves purchase return paths (%s)", async (locale) => {
    const returnTo = locale === "en" ? "/en/software/example#tool-purchase" : "/software/example#tool-purchase";
    const html = renderToStaticMarkup(await RegisterPageShell({ forceLocale: locale, searchParams: Promise.resolve({ returnTo }) }));
    expect(html).not.toContain('name="newsletterEmail"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain('name="csrfToken" value="fixture-csrf"');
    expect(html).toContain(`name="returnTo" value="${returnTo}"`);
    expect(html).toContain(encodeURIComponent(returnTo));
    expect(html).not.toMatch(/上传付款截图|upload payment screenshots/i);
  });
});
