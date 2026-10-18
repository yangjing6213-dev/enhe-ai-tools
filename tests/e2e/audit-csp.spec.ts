import { expect, test } from "@playwright/test";

test("document CSP blocks untrusted scripts while login controls hydrate", async ({ page, request }) => {
  const first = await request.get("/login");
  const second = await request.get("/login");
  const policy = first.headers()["content-security-policy"];
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce).toBeTruthy();
  expect(policy.split(";").find((d) => d.trim().startsWith("script-src "))).not.toContain("'unsafe-inline'");
  expect(second.headers()["content-security-policy"]).not.toBe(policy);
  expect(first.headers()["cache-control"]).toContain("no-store");

  await page.goto("/login");
  const password = page.locator("#login-password");
  await password.fill("Browser-audit-only");
  await password.locator("..").getByRole("button").click();
  await expect(password).toHaveAttribute("type", "text");
  await password.locator("..").getByRole("button").click();
  await expect(password).toHaveAttribute("type", "password");
  await password.fill("");

  // Simulate untrusted HTML inserted into a response, rather than executing
  // through the debugger's privileged Runtime.evaluate execution context.
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      if (event.blockedURI === "inline" && event.violatedDirective.startsWith("script-src")) {
        document.documentElement.dataset.auditScriptBlocked = "true";
      }
    });
  });
  await page.route("**/login", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace("</head>",
      "<script>document.documentElement.dataset.auditUntrustedScript='executed'</script></head>");
    await route.fulfill({ response, body });
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-audit-script-blocked", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-audit-untrusted-script", "executed");
});
