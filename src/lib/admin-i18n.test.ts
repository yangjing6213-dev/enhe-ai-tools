import { describe, expect, it } from "vitest";
import { getAdminDictionary } from "@/lib/admin-i18n";

describe("admin i18n", () => {
  it("returns Chinese labels for the admin sidebar and dashboard", () => {
    const t = getAdminDictionary("zh");

    expect(t.layout.title).toBe("后台管理");
    expect(t.nav.dashboard).toBe("数据看板");
    expect(t.dashboard.title).toBe("数据看板");
    expect(t.dashboard.stats.paidRevenue).toBe("实收金额");
  });

  it("returns English labels for the admin sidebar and dashboard", () => {
    const t = getAdminDictionary("en");

    expect(t.layout.title).toBe("Admin");
    expect(t.nav.dashboard).toBe("Dashboard");
    expect(t.dashboard.title).toBe("Admin dashboard");
    expect(t.dashboard.stats.paidRevenue).toBe("Paid revenue");
  });
});
