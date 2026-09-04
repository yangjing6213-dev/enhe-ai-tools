import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("english route audit source", () => {
  it("keeps AI Trends in the Chinese public-path middleware list for consistent locale headers", () => {
    const middleware = read("middleware.ts");

    expect(middleware).toContain('"/ai-trends"');
    expect(middleware).toContain('pathname.startsWith("/ai-trends/")');
  });

  it("renders dedicated English auth and account-center wrappers instead of plain re-exports", () => {
    const enLogin = read("src/app/en/(auth)/login/page.tsx");
    const enRegister = read("src/app/en/(auth)/register/page.tsx");
    const enUser = read("src/app/en/user/page.tsx");
    const loginShell = read("src/app/(auth)/login/page-shell.tsx");
    const registerShell = read("src/app/(auth)/register/page-shell.tsx");
    const userShell = read("src/app/user/page-shell.tsx");

    expect(enLogin).toContain("LoginPageShell");
    expect(enLogin).toContain('forceLocale="en"');
    expect(enLogin).not.toContain('export { default }');
    expect(enRegister).toContain("RegisterPageShell");
    expect(enRegister).toContain('forceLocale="en"');
    expect(enRegister).not.toContain('export { default }');
    expect(enUser).toContain("UserCenterPageShell");
    expect(enUser).toContain('forceLocale="en"');
    expect(enUser).not.toContain('export { default }');
    expect(loginShell).toContain("forceLocale");
    expect(registerShell).toContain("forceLocale");
    expect(userShell).toContain("forceLocale");
  });

  it("uses locale-aware auth redirects for unauthenticated and unauthorized users", () => {
    const auth = read("src/lib/auth.ts");
    const userShell = read("src/app/user/page-shell.tsx");

    expect(auth).toContain("export async function requireUser(localeOverride?: Locale)");
    expect(auth).toContain("const locale = localeOverride ?? (await getCurrentLocale());");
    expect(auth).toContain('redirect(buildLocalePath("/login", locale));');
    expect(auth).toContain("export async function requireAdmin(localeOverride?: Locale)");
    expect(auth).toContain('redirect(buildLocalePath("/", locale));');
    expect(auth).not.toContain('if (!user) redirect("/login");');
    expect(auth).not.toContain('if (user.role !== "admin") redirect("/");');
    expect(userShell).toContain("const user = await requireUser(locale);");
  });
});
