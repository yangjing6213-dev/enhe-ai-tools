import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const component = read(
  "src/components/seo-audit/seo-audit-monitor-settings.tsx",
);
const actions = read("src/app/user/seo-audit/actions.ts");
const scheduleRoute = read(
  "src/app/api/seo-audit/subscription/schedule/route.ts",
);
const subscriptionRoute = read("src/app/api/seo-audit/subscription/route.ts");

describe("SEO audit monitoring notification email contract", () => {
  it("lets the owner edit one validated notification email without breaking pause/resume", () => {
    expect(component).toContain("notificationEmail: string | null");
    expect(component).toContain("fallbackNotificationEmail");
    expect(component).toContain('type="email"');
    expect(component).toContain('name="notificationEmail"');
    expect(component).toContain('autoComplete="email"');
    expect(component).toContain("maxLength={320}");
    expect(actions).toContain('formData.get("notificationEmail")');
    expect(scheduleRoute).toContain(
      "z.string().trim().email().max(320).nullable()",
    );
    expect(component).toContain(
      'name="notificationEmail" value={notificationEmail}',
    );
  });

  it("returns the saved address to authenticated clients", () => {
    expect(subscriptionRoute).toContain("notificationEmail: true");
  });
});
