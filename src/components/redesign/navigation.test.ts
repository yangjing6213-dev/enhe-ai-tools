import { describe, expect, it } from "vitest";
import { isExactCurrentPage } from "./navigation";

describe("public navigation current-page state", () => {
  it("marks only the exact destination as the current page", () => {
    expect(isExactCurrentPage("/ai-news", "/ai-news")).toBe(true);
    expect(isExactCurrentPage("/ai-news/topics", "/ai-news")).toBe(false);
    expect(isExactCurrentPage("/ai-news/topics/ai-agent", "/ai-news")).toBe(false);
    expect(isExactCurrentPage("/en/ai-news/topics", "/en/ai-news")).toBe(false);
  });
});
