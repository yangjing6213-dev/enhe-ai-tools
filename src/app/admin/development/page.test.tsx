import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const { findMany, getLocale } = vi.hoisted(() => ({ findMany: vi.fn(), getLocale: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { developmentVersion: { findMany }, productRelease: { count: () => 0 }, toolChangelog: { count: () => 0 } }
}));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: getLocale }));
vi.mock("@/app/admin/actions", () => ({
  upsertDevelopmentVersionAction: vi.fn(), upsertDevelopmentItemAction: vi.fn(),
  deleteDevelopmentVersionAction: vi.fn(), deleteDevelopmentItemAction: vi.fn()
}));

import AdminDevelopmentPage from "./page";

async function renderPage(locale: string, versions: unknown[]) {
  findMany.mockResolvedValue(versions);
  getLocale.mockResolvedValue(locale);
  return renderToStaticMarkup(await AdminDevelopmentPage({ searchParams: Promise.resolve({}) }));
}

describe("development tracker", () => {
  it.each([["zh", "暂无开发版本", "新增开发版本"], ["en", "No development versions yet", "New development version"]])(
    "offers a real empty state and creation form in %s",
    async (locale, empty, create) => {
      const html = await renderPage(locale, []);
      expect(html).toContain(empty);
      expect(html).toContain(create);
      expect(html).not.toContain("2026-05-22");
      expect(html).not.toMatch(/\d+%/);
    }
  );

  it("shows saved items and keeps the original editable values in English", async () => {
    const html = await renderPage("en", [{
      id: "dev-1", version: "V2.2", name: "A real release", status: "active", items: [{
        id: "item-1", module: "基础页面", name: "首页与工具入口", status: "completed", priority: "high",
        notes: "", relatedFiles: "", sortOrder: 10, updatedAt: new Date("2026-10-30T12:00:00Z")
      }]
    }]);
    expect(html).toContain("V2.2");
    expect(html).toContain("Homepage and tool entry points");
    expect(html).toContain('value="首页与工具入口"');
    expect(html).toContain("100%");
  });
});
