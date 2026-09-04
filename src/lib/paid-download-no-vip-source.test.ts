import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("paid download without VIP source boundaries", () => {
  it("removes VIP sales from the primary header and pricing page", () => {
    const header = read("src/components/site-header.tsx");
    const pricing = read("src/app/pricing/page-shell.tsx");

    expect(header).not.toContain("t.nav.pricing");
    expect(header).not.toContain('"/pricing"');
    expect(header).not.toContain("getActiveMembership");
    expect(header).not.toContain("Crown");

    expect(pricing).not.toContain("createOrderAction");
    expect(pricing).not.toContain("vipPlan");
    expect(pricing).not.toContain("primaryCta");
    expect(pricing).toContain('href={forceLocale === "en" ? "/en/software" : "/software"}');
  });

  it("removes VIP admin operations from active admin surfaces", () => {
    const adminLayout = read("src/app/admin/layout.tsx");
    const adminDashboard = read("src/app/admin/page.tsx");
    const adminMessages = read("src/app/admin/messages/page.tsx");
    const toolAdmin = read("src/app/admin/tool-admin-list.tsx");

    expect(adminLayout).not.toContain('["plans", "/admin/plans"]');
    expect(adminDashboard).not.toContain("prisma.membership");
    expect(adminDashboard).not.toContain("activeVips");
    expect(adminDashboard).not.toContain("vipExpiring7d");
    expect(adminMessages).not.toContain("vip_expiring");
    expect(adminMessages).not.toContain("expiringMemberships");
    expect(toolAdmin).not.toContain('name="isVipRequired"');
    expect(toolAdmin).not.toContain('name="isDownloadLinkVipOnly"');
  });

  it("uses per-tool paid download access on the tool detail and user center pages", () => {
    const toolDetail = read("src/app/tools/[slug]/page-shell.tsx");
    const userCenter = read("src/app/user/page.tsx");

    expect(toolDetail).not.toContain("userHasVip");
    expect(toolDetail).not.toContain("openVip");
    expect(toolDetail).not.toContain('href="/pricing"');
    expect(toolDetail).not.toContain("isDownloadLinkVipOnly");
    expect(toolDetail).toContain("hasDownloadPurchase");
    expect(toolDetail).toContain("createSoftwareDownloadOrderAction");

    expect(userCenter).not.toContain("getActiveMembership");
    expect(userCenter).not.toContain("t.userCenter.membership");
    expect(userCenter).not.toContain('href="/pricing"');
  });
});
