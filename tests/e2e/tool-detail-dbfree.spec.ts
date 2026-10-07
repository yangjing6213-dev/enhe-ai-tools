import { expect, test } from "@playwright/test";

const routes = [
  "/software/db-free-detail-probe",
  "/en/software/db-free-detail-probe",
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
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
