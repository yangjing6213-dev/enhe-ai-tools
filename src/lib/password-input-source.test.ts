import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("password visibility input", () => {
  it("uses the shared password input on login and register pages", () => {
    const loginPage = readFileSync(new URL("../app/(auth)/login/page-shell.tsx", import.meta.url), "utf8");
    const registerPage = readFileSync(new URL("../app/(auth)/register/page-shell.tsx", import.meta.url), "utf8");

    expect(loginPage).toContain("<PasswordInput");
    expect(registerPage).toContain("<PasswordInput");
  });

  it("ships a client-side toggle button for showing and hiding the password", () => {
    const component = readFileSync(new URL("../components/password-input.tsx", import.meta.url), "utf8");

    expect(component).toContain('"use client"');
    expect(component).toContain("useState");
    expect(component).toContain('type={visible ? "text" : "password"}');
    expect(component).toContain('aria-pressed={visible}');
  });
});
