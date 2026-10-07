import { expect, test } from "@playwright/test";

test.describe("DB-free admin shell boundary", () => {
  test("redirects signed-out admin requests before a database-backed page renders", async ({ request }) => {
    const response = await request.get("/admin?tab=users", { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    const location = new URL(response.headers().location!, "http://localhost");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("returnTo")).toBe("/admin?tab=users");

    const body = await response.text();
    expect(body).not.toContain("PrismaClientInitializationError");
    expect(body).not.toContain("Environment variable not found: DATABASE_URL");

    const actionResponse = await request.post("/admin/orders?tab=payments", {
      data: { action: "fixture-only" },
      maxRedirects: 0,
    });
    expect(actionResponse.status()).toBe(303);
    const actionLocation = new URL(actionResponse.headers().location!, "http://localhost");
    expect(actionLocation.pathname).toBe("/login");
    expect(actionLocation.searchParams.get("returnTo")).toBe("/admin/orders?tab=payments");

    const actionBody = await actionResponse.text();
    expect(actionBody).not.toContain("PrismaClientInitializationError");
    expect(actionBody).not.toContain("Environment variable not found: DATABASE_URL");
  });
});
