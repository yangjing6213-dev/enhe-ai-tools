import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FolderFloatProps } from "@/components/FolderFloat";
import { SOFTWARE_CATEGORIES } from "@/lib/redesign/software/software-categories";

const mocks = vi.hoisted(() => ({ folders: [] as FolderFloatProps[], track: vi.fn() }));
vi.mock("@/components/FolderFloat", () => ({ default: (props: FolderFloatProps) => { mocks.folders.push(props); return null; } }));
vi.mock("@/components/analytics-tracker", () => ({ trackClientAnalyticsEvent: mocks.track }));
import { EnheRedesignFeatures } from "@/components/redesign/home/EnheRedesignFeatures";

Object.assign(globalThis, { React });
afterEach(() => { mocks.folders.length = 0; mocks.track.mockClear(); vi.unstubAllGlobals(); });

describe("homepage folder entry analytics", () => {
  it.each(["zh", "en"] as const)("distinguishes software categories without logging arbitrary query text in %s", locale => {
    vi.stubGlobal("window", { location: { pathname: locale === "en" ? "/en" : "/" } });
    renderToStaticMarkup(<EnheRedesignFeatures locale={locale} />);
    const categories = SOFTWARE_CATEGORIES.filter(item => !["all", "skill"].includes(item.id));
    mocks.folders[0].onSelect?.("/software?category=anything&private=do-not-log", 0);
    mocks.folders[0].onSelect?.("/software?category=anything-else", 1);
    expect(mocks.track.mock.calls.map(call => call[0].metadata.target)).toEqual([`software_${categories[0].id}`, `software_${categories[1].id}`]);
    expect(mocks.track.mock.calls[0][0]).toMatchObject({ eventName: "home_entry_click", metadata: { surface: "category_folder" } });
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain("do-not-log");
    expect(mocks.folders[0].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: `${locale === "en" ? "/en" : ""}/software?category=${categories[0].id}` }),
    ]));
  });

  it("uses real workflow links and the same analytics target across languages", () => {
    vi.stubGlobal("window", { location: { pathname: "/en" } });
    renderToStaticMarkup(<EnheRedesignFeatures locale="en" />);
    mocks.folders[1].onSelect?.("/en/ai-workflows", 2);
    expect(mocks.track).toHaveBeenCalledWith(expect.objectContaining({ metadata: { surface: "category_folder", target: "_ai-workflows" } }));
    expect(mocks.folders[1].items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "AI workflows", href: "/en/ai-workflows" }),
    ]));
  });
});
