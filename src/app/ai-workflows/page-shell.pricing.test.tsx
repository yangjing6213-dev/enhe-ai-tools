import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  tool: { findMany: vi.fn() },
  aiWorkflowTopic: { findMany: vi.fn() },
  aiWorkflowReview: { groupBy: vi.fn() },
  aiWorkflowDownloadEvent: { groupBy: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));
vi.mock("./workflow-interactions", () => ({ AiWorkflowFavoriteButton: () => null }));

import { AiWorkflowsPageShell } from "./page-shell";

describe("workflow directory price mapping", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubEnv("DATABASE_URL", "postgresql://test.local/workflows");
    prismaMock.aiWorkflowTopic.findMany.mockResolvedValue([]);
    prismaMock.aiWorkflowReview.groupBy.mockResolvedValue([]);
    prismaMock.aiWorkflowDownloadEvent.groupBy.mockResolvedValue([]);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each(["zh", "en"] as const)("does not erase the paid flag when the %s directory receives an unset or zero price", async (locale) => {
    prismaMock.tool.findMany.mockResolvedValue([null, 0, 19].map((downloadPrice, index) => ({
      id: `workflow-${index}`, slug: `workflow-${index}`, name: `Workflow ${index}`, englishName: `Workflow ${index}`,
      shortDescription: "A workflow package.", coverImage: null, isDownloadPaid: true, downloadPrice,
      downloadFileId: "file-1", tagLinks: [], _count: { aiWorkflowFavorites: 0 },
      aiWorkflowCandidate: { status: "published", fileId: "file-1", topic: null, projectType: "workflow" },
      systemRequirement: null, createdAt: new Date("2026-10-22T00:00:00Z"),
    })));
    const html = renderToStaticMarkup(await AiWorkflowsPageShell({ forceLocale: locale }));
    const badges = [...html.matchAll(/<span class="shrink-0[^"]*">([^<]*)<\/span>/g)].map((match) => match[1]);
    const pending = locale === "en" ? "Price pending" : "价格待确认";
    expect(badges).toEqual([pending, pending, "¥19.00"]);
  });
});
