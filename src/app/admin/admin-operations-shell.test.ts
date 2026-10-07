import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`./${relativePath}`, import.meta.url), "utf8");

const operationPages = [
  "page.tsx",
  "audit/page.tsx",
  "development/page.tsx",
  "releases/page.tsx",
  "seo-audit/page.tsx",
  "seo-audit/[id]/page.tsx",
  "seo-insights/page.tsx",
  "geo-monitoring/page.tsx",
  "messages/page.tsx"
];

describe("admin operations presentation boundary", () => {
  it("keeps the operations family on existing server data and action modules", () => {
    for (const page of operationPages.slice(1)) {
      expect(read(page), page).toContain("@/app/admin/admin-ui");
    }
    expect(read("page.tsx")).toContain("@/lib/admin-dashboard");
    expect(read("geo-monitoring/page.tsx")).toContain("recordGeoVisibilityResultAction");
    expect(read("seo-audit/page.tsx")).toContain("retrySeoAuditRunAction");
  });

  it("provides a scoped light treatment for panels, tables, statuses, and overflow", () => {
    const shell = read("../../styles/redesign/shell.css");

    expect(shell).toContain(".enhe-admin-shell .glass");
    expect(shell).toContain(".enhe-admin-shell :is(table, .admin-data-table)");
    expect(shell).toContain(".enhe-admin-shell [class*=\"text-[#8B95A7]\"]");
    expect(shell).toContain(".enhe-admin-shell .admin-table-scroll");
    expect(shell).toContain("@media (forced-colors: active)");
  });
});
