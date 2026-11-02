import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("Google sign-in contrast", () => {
  it("keeps the white Google button text dark and legible in every state", () => {
    const login = readFileSync(resolve(root, "src/app/(auth)/login/page-shell.tsx"), "utf8");
    const styles = readFileSync(resolve(root, "src/styles/redesign/site-refresh.css"), "utf8");

    expect(login).toContain('className="google-login-button');
    expect(styles).toContain(".enhe-auth-page .google-login-button:is(:hover, :focus, :active)");
    expect(styles).toContain(".enhe-auth-page .google-login-button *");
    expect(styles).toContain("-webkit-text-fill-color: #1f2937 !important");
  });
});
