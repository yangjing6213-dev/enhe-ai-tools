import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  permanentRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => navigation);
vi.mock("@/app/ai-news/page-shell", () => ({
  AiNewsPageShell: () => null,
  generateAiNewsPageMetadata: vi.fn(async () => ({})),
}));
vi.mock("@/components/public-site-chrome", () => ({
  PublicSiteChrome: ({ children }: { children: unknown }) => children,
}));
vi.stubGlobal("React", React);

import EnglishAiNewsPaginationPage from "@/app/en/ai-news/page/[page]/page";
import AiNewsPaginationPage from "@/app/(zh-public)/ai-news/page/[page]/page";

const emptySearchParams = Promise.resolve({});

describe.each([
  ["zh", AiNewsPaginationPage, "/ai-news"],
  ["en", EnglishAiNewsPaginationPage, "/en/ai-news"],
] as const)("%s AI news pagination route", (_locale, Page, basePath) => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permanently redirects the canonical page-one path", async () => {
    await expect(
      Page({
        params: Promise.resolve({ page: "1" }),
        searchParams: emptySearchParams,
      }),
    ).rejects.toThrow(`NEXT_REDIRECT:${basePath}`);
    expect(navigation.permanentRedirect).toHaveBeenCalledWith(basePath);
  });

  it.each(["news", "0", "-1", "01", "1.5", String(Number.MAX_SAFE_INTEGER)])(
    "returns not found for the non-canonical page value %s",
    async (page) => {
      await expect(
        Page({
          params: Promise.resolve({ page }),
          searchParams: emptySearchParams,
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(navigation.notFound).toHaveBeenCalledOnce();
      expect(navigation.permanentRedirect).not.toHaveBeenCalled();
    },
  );
});
