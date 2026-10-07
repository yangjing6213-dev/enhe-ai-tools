import { expect, test } from "@playwright/test";

const routes = [
  "/ai-news/db-free-detail-probe",
  "/en/ai-news/db-free-detail-probe",
] as const;

for (const route of routes) {
  test(`${route} fails closed without a database`, async ({ page }) => {
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    const response = await page.goto(route, { waitUntil: "networkidle" });

    expect(response?.status()).toBe(404);
    const robotsContent = await page
      .locator('meta[name="robots"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("content") ?? ""),
      );
    expect(
      robotsContent.some(
        (content) => /noindex/i.test(content) && /follow/i.test(content),
      ),
    ).toBe(true);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      route.startsWith("/en/")
        ? "UNVERIFIED - AI News detail content is not available in this local preview."
        : "待核验：本地预览不提供 AI 资讯详情内容。",
    );
    const structuredData = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(structuredData.join("\n")).not.toMatch(
      /NewsArticle|FAQPage|CollectionPage|ItemList/,
    );
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
