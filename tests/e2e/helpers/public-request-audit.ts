import { expect, test, type Page, type Request } from "@playwright/test";

type NavigationProof = {
  source: string;
  target: string;
  viewport: { width: number; height: number } | null;
};

function documentPath(url: URL) {
  url.searchParams.delete("_rsc");
  return `${url.pathname}${url.search}`;
}

export function auditPublicRequests(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const requestSources = new Map<Request, NavigationProof>();
  const successfulPrefetches = new Set<Request>();
  const cancelledPrefetches = new Map<string, NavigationProof>();
  let verifyingNavigation = false;

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.headers().rsc !== "1" ||
      request.headers()["next-router-prefetch"] !== "1") return;
    const target = new URL(request.url());
    const source = new URL(request.headers().referer || page.url());
    if (source.origin !== target.origin) return;
    requestSources.set(request, {
      source: documentPath(source), target: documentPath(target), viewport: page.viewportSize(),
    });
  });
  page.on("response", (response) => {
    const request = response.request();
    if (response.status() === 200 && requestSources.has(request) &&
      new URL(request.url()).origin === new URL(page.url()).origin &&
      response.headers()["content-type"]?.split(";", 1)[0].trim() === "text/x-component") {
      successfulPrefetches.add(request);
    }
  });
  page.on("requestfailed", (request) => {
    const aborted = request.failure()?.errorText === "net::ERR_ABORTED";
    // Only the extra click-proof phase permits leaving-page background aborts.
    // Document failures and all other errors remain failures in both phases.
    if (verifyingNavigation && !request.isNavigationRequest() && aborted) return;
    if (!verifyingNavigation && aborted && successfulPrefetches.has(request)) {
      const proof = requestSources.get(request)!;
      cancelledPrefetches.set(JSON.stringify(proof), proof);
      return;
    }
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`);
  });

  function assertNoErrors(context: string) {
    expect(consoleErrors, context).toEqual([]);
    expect(pageErrors, context).toEqual([]);
    expect(failedRequests, context).toEqual([]);
  }

  return {
    async verify() {
      await page.waitForLoadState("networkidle");
      assertNoErrors(page.url());
      // Freeze the initial observations. Click-proof navigation cannot add new
      // exceptions, and each source/target/viewport must receive its own proof.
      const cancelled = [...cancelledPrefetches.values()];
      const verified: NavigationProof[] = [];
      expect(cancelled.length).toBeLessThanOrEqual(20);
      verifyingNavigation = true;
      try {
        for (const proof of cancelled) {
          const context = `${proof.source} -> ${proof.target}`;
          if (proof.viewport) await page.setViewportSize(proof.viewport);
          const sourceResponse = await page.goto(proof.source, { waitUntil: "load" });
          expect(sourceResponse?.status(), context).toBe(200);
          const response = await page.request.get(proof.target);
          expect(response.status(), context).toBe(200);
          const expectedHeading = await page.evaluate((html) =>
            new DOMParser().parseFromString(html, "text/html").querySelector("main h1")?.textContent?.trim(),
          await response.text());
          expect(expectedHeading, context).toBeTruthy();
          const link = page.locator(`a[href=${JSON.stringify(proof.target)}]:visible`).first();
          await expect(link, context).toHaveCount(1);
          await link.scrollIntoViewIfNeeded();
          await link.click();
          await expect(page, context).toHaveURL((url) => `${url.pathname}${url.search}` === proof.target);
          await expect(page.locator("main h1"), context).toHaveText(expectedHeading!);
          assertNoErrors(context);
          verified.push(proof);
        }
        expect(verified).toEqual(cancelled);
      } finally {
        await test.info().attach("cancelled-prefetch-navigation-proof", {
          body: JSON.stringify({ cancelled, verified }), contentType: "application/json",
        });
      }
    },
  };
}
