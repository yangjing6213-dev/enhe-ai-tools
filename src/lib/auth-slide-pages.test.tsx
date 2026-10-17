import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

const actions = vi.hoisted(() => ({ loginAction: vi.fn(), registerAction: vi.fn() }));
vi.mock("@/app/actions", () => actions);
vi.mock("@/lib/csrf", () => ({ getOrCreateCsrfToken: async () => "test-csrf" }));

function findElement(
  element: React.ReactNode,
  type: React.ElementType,
): React.ReactElement<{ action?: unknown; submitAction?: unknown }> | undefined {
  if (!React.isValidElement<{ children?: React.ReactNode }>(element)) return undefined;
  if (element.type === type) return element as React.ReactElement<{ action?: unknown; submitAction?: unknown }>;
  return React.Children.toArray(element.props.children).map(child => findElement(child, type)).find(Boolean);
}

describe("authentication slide submission", () => {
  it.each([
    ["zh", "向右滑动登录", "登录"],
    ["en", "Slide to log in", "Log in"],
  ] as const)("connects the %s login slide to the original form", async (locale, label, fallbackLabel) => {
    const { LoginPageShell } = await import("@/app/(auth)/login/page-shell");
    const { AuthSlideSubmit } = await import("@/components/auth/auth-slide-submit");
    const page = await LoginPageShell({
      forceLocale: locale,
      searchParams: Promise.resolve({ returnTo: "/software/windows-ai" }),
    });
    const html = renderToStaticMarkup(page);

    expect(findElement(page, "form")?.props.action).toBe(actions.loginAction);
    expect(findElement(page, AuthSlideSubmit)?.props.submitAction).toBe(actions.loginAction);
    expect(html).toContain(label);
    expect(html).toContain('role="slider"');
    expect(html).toContain('data-auth-slide-submit="true"');
    expect(html).toContain('<button type="submit" hidden=""');
    expect(html).toContain("<noscript>");
    expect(html).toContain(`>${fallbackLabel}</button></noscript>`);
    expect(html).toContain('name="csrfToken" value="test-csrf"');
    expect(html).toContain('name="returnTo" value="/software/windows-ai"');
    expect(html).toContain('href="/api/auth/google/start?returnTo=%2Fsoftware%2Fwindows-ai"');
  });

  it.each([
    ["zh", "向右滑动创建账号", "创建账号"],
    ["en", "Slide to create account", "Create account"],
  ] as const)("connects the %s registration slide to the original form", async (locale, label, fallbackLabel) => {
    const { RegisterPageShell } = await import("@/app/(auth)/register/page-shell");
    const { AuthSlideSubmit } = await import("@/components/auth/auth-slide-submit");
    const page = await RegisterPageShell({
      forceLocale: locale,
      searchParams: Promise.resolve({ returnTo: "/software/windows-ai" }),
    });
    const html = renderToStaticMarkup(page);

    expect(findElement(page, "form")?.props.action).toBe(actions.registerAction);
    expect(findElement(page, AuthSlideSubmit)?.props.submitAction).toBe(actions.registerAction);
    expect(html).toContain(label);
    expect(html).toContain('role="slider"');
    expect(html).toContain('data-auth-slide-submit="true"');
    expect(html).toContain('<button type="submit" hidden=""');
    expect(html).toContain("<noscript>");
    expect(html).toContain(`>${fallbackLabel}</button></noscript>`);
    expect(html).toContain('name="csrfToken" value="test-csrf"');
    expect(html).toContain('name="returnTo" value="/software/windows-ai"');
    expect(html).toContain('href="/api/auth/google/start?returnTo=%2Fsoftware%2Fwindows-ai"');
  });

  it("keeps the original login error visible and offers the retry slide", async () => {
    const { LoginPageShell } = await import("@/app/(auth)/login/page-shell");
    const html = renderToStaticMarkup(await LoginPageShell({
      forceLocale: "zh",
      searchParams: Promise.resolve({ message: "invalid" }),
    }));

    expect(html).toContain("账号或密码错误");
    expect(html).toContain("向右滑动重试登录");
    expect(html).toContain('data-phase="error"');
    expect(html).not.toContain("支付成功");
  });
});
