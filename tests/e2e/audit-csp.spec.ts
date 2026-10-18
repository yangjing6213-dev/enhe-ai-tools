import { expect, test } from "@playwright/test";

for (const [path, language] of [
  ["/audit-csp-missing/deep-page", "zh-CN"],
  ["/en/audit-csp-missing/deep-page", "en-US"],
] as const) {
  test(`unknown route ${path} returns a script-free localized 404`, async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        if (event.violatedDirective.startsWith("script-src")) {
          document.documentElement.dataset.auditUnexpectedScriptViolation = "true";
        }
      });
    });
    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status()).toBe(404);
    const policy = response?.headers()["content-security-policy"] ?? "";
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
    expect(nonce).toBeTruthy();
    expect(response?.headers()["cache-control"]).toContain("no-store");
    const scripts = await page.locator("script").evaluateAll((elements) =>
      elements
        .filter((element) => {
          const type = element.getAttribute("type");
          return !type || /^(?:module|text\/javascript|application\/javascript)$/.test(type);
        })
        .map((element) => element.getAttribute("nonce")),
    );
    // The dedicated unknown-address response needs no app bootstrap. Keep it
    // entirely script-free instead of allowing nonced framework hydration.
    expect(scripts).toHaveLength(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-audit-unexpected-script-violation", "true");
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
    const robots = await page.locator('meta[name="robots"]').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content") ?? ""),
    );
    expect(robots.some((value) => value.split(",").some((token) => token.trim() === "noindex"))).toBe(true);
    expect(robots.some((value) => value.split(",").some((token) => token.trim() === "index"))).toBe(false);
    await expect(page.getByRole("link")).toHaveAttribute("href", language === "en-US" ? "/en" : "/");
    expect(response?.headers()["content-language"]).toBe(language);
  });
}

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
