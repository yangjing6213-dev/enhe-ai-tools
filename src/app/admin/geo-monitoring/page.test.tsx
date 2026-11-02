import { beforeEach, expect, it, vi } from "vitest";
import * as React from "react";
import { GEO_MONITORING_QUERIES } from "@/lib/geo-monitoring";
import { recordGeoVisibilityResultAction } from "./actions";
import AdminGeoMonitoringPage from "./page";

Object.assign(globalThis, { React });
const db = vi.hoisted(() => ({
  geoVisibilityResult: { groupBy: vi.fn(async () => []), create: vi.fn(() => "save-sample") },
  geoQuery: { count: vi.fn(async () => 0), createMany: vi.fn(() => "ensure-query"), upsert: vi.fn() },
  geoProvider: { count: vi.fn(async () => 0), createMany: vi.fn(() => "ensure-provider"), upsert: vi.fn() },
  $transaction: vi.fn(),
}));
const authorize = vi.hoisted(() => vi.fn(async () => ({ id: "admin" })));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ requireAdmin: authorize }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it("reads the ledger without creating or refreshing preset records", async () => {
  await AdminGeoMonitoringPage();
  expect(authorize).toHaveBeenCalledOnce();
  expect(db.geoVisibilityResult.groupBy).toHaveBeenCalledOnce();
  expect(db.geoQuery.upsert).not.toHaveBeenCalled();
  expect(db.geoProvider.upsert).not.toHaveBeenCalled();
  expect(db.geoQuery.createMany).not.toHaveBeenCalled();
  expect(db.geoProvider.createMany).not.toHaveBeenCalled();
  expect(db.geoVisibilityResult.create).not.toHaveBeenCalled();
});

it("records only the selected presets and the new manual sample together, preserving existing presets", async () => {
  const preset = GEO_MONITORING_QUERIES[0];
  const form = new FormData();
  form.set("queryText", preset.query);
  form.set("providerKey", "doubao");
  await recordGeoVisibilityResultAction(form);
  expect(authorize).toHaveBeenCalledOnce();
  expect(db.geoQuery.createMany).toHaveBeenCalledExactlyOnceWith({
    data: expect.objectContaining({ query: preset.query, locale: preset.locale }), skipDuplicates: true,
  });
  expect(db.geoProvider.createMany).toHaveBeenCalledExactlyOnceWith({
    data: expect.objectContaining({ providerKey: "doubao" }), skipDuplicates: true,
  });
  expect(db.geoVisibilityResult.create).toHaveBeenCalledExactlyOnceWith({
    data: expect.objectContaining({ queryText: preset.query, providerKey: "doubao", checkedAt: expect.any(Date) }),
  });
  expect(db.$transaction).toHaveBeenCalledExactlyOnceWith(["ensure-query", "ensure-provider", "save-sample"]);
});

it("rejects an unconfigured platform before attempting any writes", async () => {
  const form = new FormData();
  form.set("queryText", GEO_MONITORING_QUERIES[0].query);
  form.set("providerKey", "not-an-approved-provider");
  await expect(recordGeoVisibilityResultAction(form)).rejects.toThrow();
  expect(db.$transaction).not.toHaveBeenCalled();
  expect(db.geoQuery.createMany).not.toHaveBeenCalled();
  expect(db.geoProvider.createMany).not.toHaveBeenCalled();
  expect(db.geoVisibilityResult.create).not.toHaveBeenCalled();
});
