import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("authentication route source boundaries", () => {
  it("renders authentication routes at request time so CSRF tokens never use build-time secrets", () => {
    for (const path of [
      "src/app/(auth)/login/page.tsx",
      "src/app/(auth)/register/page.tsx",
      "src/app/en/(auth)/login/page.tsx",
      "src/app/en/(auth)/register/page.tsx",
    ]) {
      const source = readFileSync(resolve(root, path), "utf8");
      expect(source).toContain('export const dynamic = "force-dynamic"');
    }
  });

  it("offers Google registration and validates a one-time verified Google identity", () => {
    const register = readFileSync(resolve(root, "src/app/(auth)/register/page-shell.tsx"), "utf8");
    const startRoute = resolve(root, "src/app/api/auth/google/start/route.ts");
    const callbackRoute = resolve(root, "src/app/api/auth/google/callback/route.ts");
    const googleOAuth = resolve(root, "src/lib/google-oauth.ts");
    const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

    expect(register).toContain("/api/auth/google/start");
    expect(existsSync(startRoute)).toBe(true);
    expect(existsSync(callbackRoute)).toBe(true);
    expect(existsSync(googleOAuth)).toBe(true);
    expect(schema).toContain("googleSubject");
    if (!existsSync(startRoute) || !existsSync(callbackRoute) || !existsSync(googleOAuth)) return;

    const start = readFileSync(startRoute, "utf8");
    const callback = readFileSync(callbackRoute, "utf8");
    const verification = readFileSync(googleOAuth, "utf8");
    expect(start).toContain("state");
    expect(callback).toContain("verifyGoogleIdToken");
    expect(verification).toContain("jwtVerify");
    expect(verification).toContain("nonce");
    expect(verification).toContain("email_verified");
  });
});
