import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Script } from "node:vm";
import { parseAdminVisualLoopbackBaseUrl } from "../fixtures/admin-visual-base-url";

const diagnostics = new WeakMap<Page, {
  externalRequests: string[];
  writeMethods: string[];
  expectedBlockedWrites: Set<string>;
  pageErrors: string[];
  consoleErrors: Set<string>;
  expectedConsoleErrors: Set<string>;
  expectedNotFoundPaths?: Set<string>;
  expectedNotFoundDocumentUrls?: Set<string>;
  scriptDiagnostics?: {
    events: unknown[];
    pending: Promise<unknown>[];
    sources: Map<string, Buffer>;
  };
}>();

test.setTimeout(120_000);

const workflows = [
  { path: "/admin/ai-news", title: "AI资讯管理" },
  { path: "/admin/ai-news/new", title: "新增 AI 资讯" },
  { path: "/admin/ai-news/import", title: "导入 AI 资讯 HTML" }
];

const missingAdminDetailRoutes = [
  "/admin/ai-news/local-missing-article",
  "/admin/ai-news/topics/local-missing-topic",
  "/admin/product-demos/local-missing-demo",
  "/admin/faqs/local-missing-faq",
  "/admin/changelogs/local-missing-changelog",
  "/admin/tutorials/local-missing-tutorial",
  "/admin/online-tools/local-missing-tool",
  "/admin/skill-learning/local-missing-tool",
  "/admin/ai-skills/local-missing-tool"
];

const populatedAdminDetailRoutes = [
  {
    path: "/admin/ai-news/local-visual-article",
    heading: "编辑 AI 资讯",
    surface: ".enhe-admin-content-form > div > form",
    valueSelector: 'input[name="title"]',
    value: "Local visual fixture AI news article"
  },
  {
    path: "/admin/ai-news/topics/local-visual-topic",
    heading: "编辑 AI 资讯专题",
    surface: ".enhe-admin-topic-editor-form",
    valueSelector: 'input[name="title"]',
    value: "Local visual fixture topic"
  },
  {
    path: "/admin/product-demos/local-visual-demo",
    heading: "编辑产品视频演示",
    surface: ".enhe-admin-product-demo-form",
    valueSelector: 'input[name="title"]',
    value: "Local visual fixture product demo"
  },
  {
    path: "/admin/faqs/local-visual-faq",
    heading: "编辑 FAQ",
    surface: ".enhe-admin-faq-editor-form",
    valueSelector: 'input[name="question"]',
    value: "Local visual fixture question"
  },
  {
    path: "/admin/changelogs/local-visual-changelog",
    heading: "编辑工具版本记录",
    surface: ".enhe-admin-changelog-editor-form",
    valueSelector: 'input[name="title"]',
    value: "Local visual fixture changelog"
  },
  {
    path: "/admin/tutorials/local-visual-tutorial",
    heading: "编辑教程",
    surface: ".enhe-admin-tutorial-editor-form",
    valueSelector: 'input[name="title"]',
    value: "Local visual fixture tutorial"
  },
  {
    path: "/admin/online-tools/local-visual-online-tool",
    heading: "编辑AI账号服务",
    surface: ".enhe-admin-tool-editor-form",
    valueSelector: 'input[name="name"]',
    value: "Local visual fixture online service",
    capture: true
  },
  {
    path: "/admin/skill-learning/local-visual-skill-course",
    heading: "编辑AI技能学习课程",
    surface: ".enhe-admin-tool-editor-form",
    valueSelector: 'input[name="name"]',
    value: "Local visual fixture skill-learning course",
    capture: true
  },
  {
    path: "/admin/ai-skills/local-visual-ai-skill",
    heading: "编辑 AI Skill",
    surface: ".enhe-admin-tool-editor-form",
    valueSelector: 'input[name="name"]',
    value: "Local visual fixture AI Skill",
    capture: true
  }
];

const toolWorkflows = [
  { path: "/admin/software", view: "list" },
  { path: "/admin/software/new", view: "editor" },
  { path: "/admin/online-tools", view: "list" },
  { path: "/admin/online-tools/new", view: "editor" },
  { path: "/admin/skill-learning", view: "list" },
  { path: "/admin/skill-learning/new", view: "editor" },
  { path: "/admin/ai-skills", view: "list" },
  { path: "/admin/ai-skills/new", view: "editor" }
];

const contentManagementWorkflows = [
  { path: "/admin/product-demos", view: "list", surface: ".enhe-admin-content-records" },
  { path: "/admin/product-demos/new", view: "editor", surface: ".enhe-admin-product-demo-form" },
  { path: "/admin/tutorials", view: "list", surface: ".enhe-admin-content-records" },
  { path: "/admin/tutorials/new", view: "editor", surface: ".enhe-admin-tutorial-editor-form" },
  { path: "/admin/ai-news/topics", view: "list", surface: ".enhe-admin-content-records" },
  { path: "/admin/ai-news/topics/new", view: "editor", surface: ".enhe-admin-topic-editor-form" },
  { path: "/admin/ai-news/keywords", view: "editor", surface: ".enhe-admin-keyword-create-form" },
  { path: "/admin/faqs", view: "list", surface: ".enhe-admin-content-records" },
  { path: "/admin/faqs/new", view: "editor", surface: ".enhe-admin-faq-editor-form" },
  { path: "/admin/categories", view: "editor", surface: ".enhe-admin-category-create-form" },
  { path: "/admin/tags", view: "editor", surface: ".enhe-admin-tag-create-form" },
  { path: "/admin/changelogs", view: "list", surface: ".enhe-admin-content-records" },
  { path: "/admin/changelogs/new", view: "editor", surface: ".enhe-admin-changelog-editor-form" },
  { path: "/admin/comments", view: "list", surface: ".enhe-admin-comment-filter-form" },
  { path: "/admin/files", view: "editor", surface: ".enhe-admin-file-upload-panel" },
  { path: "/admin/manuals", view: "list", surface: ".enhe-admin-manual-card" }
];

test.beforeEach(async ({ page, context, baseURL }) => {
  const baseOrigin = parseAdminVisualLoopbackBaseUrl(baseURL).origin;

  const externalRequests: string[] = [];
  const writeMethods: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors = new Set<string>();
  const result = {
    externalRequests,
    writeMethods,
    expectedBlockedWrites: new Set<string>(),
    pageErrors,
    consoleErrors,
    expectedConsoleErrors: new Set<string>(),
    expectedNotFoundPaths: new Set<string>(),
    expectedNotFoundDocumentUrls: new Set<string>()
  } as NonNullable<ReturnType<typeof diagnostics.get>>;
  diagnostics.set(page, result);

  if (process.env.ENHE_ADMIN_VISUAL_DIAGNOSTICS === "1") {
    const scripts = { events: [] as unknown[], pending: [] as Promise<unknown>[], sources: new Map<string, Buffer>() };
    result.scriptDiagnostics = scripts;
    const session = await context.newCDPSession(page);
    session.on("Runtime.exceptionThrown", (event) => scripts.events.push({ kind: "exception", details: event.exceptionDetails }));
    session.on("Debugger.scriptFailedToParse", (event) => {
      scripts.events.push({ kind: "scriptFailedToParse", details: event });
      scripts.pending.push(session.send("Debugger.getScriptSource", { scriptId: event.scriptId }).then(({ scriptSource }) => {
        const body = Buffer.from(scriptSource);
        const sha256 = createHash("sha256").update(body).digest("hex");
        scripts.sources.set(sha256, body);
        scripts.events.push({ kind: "failedScriptSource", scriptId: event.scriptId, sha256, bytes: body.length });
      }).catch((error) => scripts.events.push({ kind: "sourceCaptureError", message: String(error) })));
    });
    await session.send("Runtime.enable");
    await session.send("Debugger.enable");
    page.on("response", (response) => {
      if (new URL(response.url()).origin !== baseOrigin || response.request().resourceType() !== "script") return;
      scripts.pending.push(response.body().then((body) => {
        const sha256 = createHash("sha256").update(body).digest("hex");
        scripts.sources.set(sha256, body);
        let syntaxError: string | null = null;
        try { new Script(body.toString("utf8"), { filename: response.url() }); }
        catch (error) { syntaxError = String(error); }
        scripts.events.push({ kind: "scriptResponse", url: response.url(), status: response.status(), bytes: body.length, sha256, syntaxError });
      }).catch((error) => scripts.events.push({ kind: "responseCaptureError", url: response.url(), message: String(error) })));
    });
  }

  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseOrigin }]);
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const method = route.request().method();
    if (
      requestUrl.origin === baseOrigin &&
      method === "POST" &&
      requestUrl.pathname === "/__nextjs_original-stack-frames"
    ) {
      await route.continue();
      return;
    }
    if (requestUrl.origin !== baseOrigin) {
      externalRequests.push(requestUrl.origin);
      await route.abort();
      return;
    }
    if (method !== "GET" && method !== "HEAD") {
      await route.abort();
      return;
    }
    await route.continue();
  });
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    const isAllowedNextDiagnosticsRequest =
      requestUrl.origin === baseOrigin &&
      request.method() === "POST" &&
      requestUrl.pathname === "/__nextjs_original-stack-frames";
    if (!["GET", "HEAD"].includes(request.method()) && !isAllowedNextDiagnosticsRequest) {
      writeMethods.push(`${request.method()} ${requestUrl.pathname}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (
      response.request().isNavigationRequest() &&
      response.status() === 404 &&
      result.expectedNotFoundPaths?.has(new URL(response.url()).pathname)
    ) {
      result.expectedNotFoundDocumentUrls?.add(response.url());
    }
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const isExpectedNotFoundDocument =
      message.text() === "Failed to load resource: the server responded with a status of 404 (Not Found)" &&
      result.expectedNotFoundDocumentUrls?.delete(message.location().url);
    if (!isExpectedNotFoundDocument) consoleErrors.add(message.text());
  });

  await page.setViewportSize({ width: 1280, height: 900 });
});

test.afterEach(async ({ page }, testInfo) => {
  const result = diagnostics.get(page);
  if (result?.scriptDiagnostics) {
    await Promise.allSettled(result.scriptDiagnostics.pending);
    const scriptEvents = result.scriptDiagnostics.events as Array<{ kind: string; syntaxError?: string | null }>;
    expect(scriptEvents.filter((event) => event.kind === "scriptFailedToParse")).toEqual([]);
    expect(scriptEvents.filter((event) => event.kind === "scriptResponse" && event.syntaxError)).toEqual([]);
    const diagnosticPath = testInfo.outputPath("local-script-diagnostics.json");
    await mkdir(dirname(diagnosticPath), { recursive: true });
    await writeFile(diagnosticPath, JSON.stringify(result.scriptDiagnostics.events, null, 2));
    await testInfo.attach("local-script-diagnostics", { path: diagnosticPath, contentType: "application/json" });
    if (result.pageErrors.length || result.consoleErrors.size) {
      for (const [sha256, body] of result.scriptDiagnostics.sources) {
        const scriptPath = testInfo.outputPath(`local-script-${sha256}.js`);
        await writeFile(scriptPath, body);
        await testInfo.attach(`local-script-${sha256}`, { path: scriptPath, contentType: "text/javascript" });
      }
    }
  }
  expect(result?.externalRequests).toEqual([]);
  expect(result?.writeMethods?.sort()).toEqual(
    [...(result?.expectedBlockedWrites ?? [])].sort(),
  );
  expect(result?.pageErrors).toEqual([]);
  expect([...(result?.consoleErrors ?? [])].sort()).toEqual(
    [...(result?.expectedConsoleErrors ?? [])].sort(),
  );
  diagnostics.delete(page);
});

test("blocks same-origin non-read requests before they reach the fixture server", async ({ page }) => {
  const result = diagnostics.get(page);
  if (!result) throw new Error("The local visual diagnostics are required for the write guard probe.");
  result.expectedBlockedWrites.add("POST /__fixture_write_guard_probe");
  result.expectedBlockedWrites.add("PUT /__nextjs_original-stack-frames");
  result.expectedConsoleErrors.add("Failed to load resource: net::ERR_FAILED");
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const requestsWereAborted = await page.evaluate(async () => {
    const requests = [
      fetch("/__fixture_write_guard_probe", { method: "POST" }),
      fetch("/__nextjs_original-stack-frames", { method: "PUT" }),
    ];
    const results = await Promise.all(requests.map(async (request) => {
      try {
        await request;
        return false;
      } catch {
        return true;
      }
    }));
    return results.every(Boolean);
  });

  expect(requestsWereAborted).toBe(true);
});

test("Missing admin detail records return not-found across the design widths", async ({ page }) => {
  const result = diagnostics.get(page);
  if (!result?.expectedNotFoundPaths) throw new Error("The local visual diagnostics are required for missing-record routes.");
  for (const route of missingAdminDetailRoutes) result.expectedNotFoundPaths.add(route);

  const unexpectedHttpErrors: string[] = [];
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    const isExpectedNotFoundDocument = response.request().isNavigationRequest() &&
      response.status() === 404 && missingAdminDetailRoutes.includes(pathname);
    if (response.status() >= 400 && !isExpectedNotFoundDocument) {
      unexpectedHttpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  const widths = [320, 390, 480, 768, 1024, 1280, 1440];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of missingAdminDetailRoutes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route} at ${width}px`).toBe(404);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}px`).toBeLessThanOrEqual(width);
    }
  }
  expect(unexpectedHttpErrors).toEqual([]);
});

test("Populated admin content detail editors render across all design widths", async ({ page }, testInfo) => {
  const widths = [320, 390, 480, 768, 1024, 1280, 1440];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of populatedAdminDetailRoutes) {
      await test.step(`${route.path} renders its saved fields at ${width}px`, async () => {
        const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
        expect(response?.status(), `${route.path} at ${width}px`).toBe(200);
        await expect(page.locator("#main-content h1")).toHaveText(route.heading);
        await expect(page.locator(route.surface)).toBeVisible();
        await expect(page.locator(route.valueSelector)).toHaveValue(route.value);

        const geometry = await page.locator("#main-content").evaluate((main) => {
          const surface = main.querySelector(".enhe-admin-content-management, .enhe-admin-content-form, .enhe-admin-tool-editor-form");
          const rect = main.getBoundingClientRect();
          const surfaceRect = surface?.getBoundingClientRect();
          return {
            documentWidth: document.documentElement.scrollWidth,
            mainLeft: rect.left,
            mainRight: rect.right,
            surfaceLeft: surfaceRect?.left ?? rect.left,
            surfaceRight: surfaceRect?.right ?? rect.right
          };
        });

        expect(geometry.documentWidth, `${route.path} document overflow at ${width}px`).toBeLessThanOrEqual(width);
        expect(geometry.mainLeft, `${route.path} main left edge at ${width}px`).toBeGreaterThanOrEqual(0);
        expect(geometry.mainRight, `${route.path} main right edge at ${width}px`).toBeLessThanOrEqual(width);
        expect(geometry.surfaceLeft, `${route.path} content left edge at ${width}px`).toBeGreaterThanOrEqual(0);
        expect(geometry.surfaceRight, `${route.path} content right edge at ${width}px`).toBeLessThanOrEqual(width);
        if ("capture" in route && route.capture && width === 1440) {
          await page.screenshot({
            path: testInfo.outputPath(`${route.path.split("/").filter(Boolean).join("-")}.png`),
            fullPage: true,
            caret: "initial"
          });
        }
      });
    }
  }
});

test("Admin AI News desktop pages keep the shared shell", async ({ page }) => {
  for (const workflow of workflows) {
    await page.goto(workflow.path);
    await expect(page.locator("#main-content h1")).toHaveText(workflow.title);
    await expect(page.locator(".enhe-admin-shell")).toBeVisible();
    await expect(page.locator(".enhe-admin-provenance-note")).toContainText("UNVERIFIED");
    await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);

    const desktopGeometry = await page.evaluate(() => ({
      sidebar: document.querySelector(".admin-sidebar")?.getBoundingClientRect().width,
      topbar: document.querySelector(".admin-topbar")?.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    expect(desktopGeometry).toEqual({ sidebar: 220, topbar: 69, overflow: false });
  }
});

test("Admin AI News import page renders without a database", async ({ page }) => {
  await page.goto("/admin/ai-news/import");

  await expect(page.locator("#main-content h1")).toBeVisible();
  await expect(page.locator(".enhe-admin-content-form")).toBeVisible();
  await expect(page.locator('input[name="htmlFile"]')).toBeVisible();
  await expect(page.locator('textarea[name="html"]')).toBeVisible();
});

test("Admin AI News workflow routes render across all design breakpoints", async ({ page }) => {
  for (const width of [320, 390, 480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });

    for (const workflow of workflows) {
      await test.step(`${workflow.path} fits at ${width}px`, async () => {
        const response = await page.goto(workflow.path, { waitUntil: "load" });
        expect(response?.status(), `${workflow.path} response`).toBe(200);
        await expect(page.locator(".enhe-admin-shell")).toBeVisible();
        await expect(page.locator("#main-content h1")).toHaveText(workflow.title);
        await expect(page.locator(".enhe-admin-provenance-note")).toContainText("UNVERIFIED");
        await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);

        const contentSurface = page.locator(workflow.path === "/admin/ai-news" ? ".enhe-admin-content-table" : ".enhe-admin-content-form").first();
        await expect(contentSurface).toBeVisible();
        const geometry = await page.evaluate(() => {
          const main = document.querySelector("#main-content");
          if (!main) throw new Error("Expected the admin main content landmark.");
          const rect = main.getBoundingClientRect();
          return {
            viewport: window.innerWidth,
            document: document.documentElement.scrollWidth,
            mainLeft: rect.left,
            mainRight: rect.right
          };
        });

        expect(geometry.viewport, `${workflow.path} viewport`).toBe(width);
        expect(geometry.document, `${workflow.path} document overflow`).toBeLessThanOrEqual(width);
        expect(geometry.mainLeft, `${workflow.path} main left edge`).toBeGreaterThanOrEqual(0);
        expect(geometry.mainRight, `${workflow.path} main right edge`).toBeLessThanOrEqual(width);
        if (workflow.path === "/admin/ai-news") {
          const tableGeometry = await contentSurface.evaluate((surface) => {
            const rect = surface.getBoundingClientRect();
            return {
              left: rect.left,
              right: rect.right,
              overflows: surface.scrollWidth > surface.clientWidth,
              overflowX: getComputedStyle(surface).overflowX
            };
          });
          expect(tableGeometry.left, `${workflow.path} table left edge`).toBeGreaterThanOrEqual(0);
          expect(tableGeometry.right, `${workflow.path} table right edge`).toBeLessThanOrEqual(geometry.mainRight);
          if (width === 320) expect(tableGeometry.overflows).toBe(true);
          if (tableGeometry.overflows) {
            expect(["auto", "scroll"], `${workflow.path} table overflow containment`).toContain(tableGeometry.overflowX);
          }
        } else {
          const surfaceBounds = await contentSurface.evaluate((surface) => {
            const rect = surface.getBoundingClientRect();
            return { left: rect.left, right: rect.right };
          });
          expect(surfaceBounds.left, `${workflow.path} form left edge`).toBeGreaterThanOrEqual(0);
          expect(surfaceBounds.right, `${workflow.path} form right edge`).toBeLessThanOrEqual(width);
        }
      });
    }
  }
});

test("Admin tool families retain their desktop list and editor surfaces", async ({ page }) => {
  for (const workflow of toolWorkflows) {
    await page.goto(workflow.path, { waitUntil: "load" });
    await expect(page.locator(".enhe-admin-tool-workflow")).toBeVisible();
    await expect(page.locator("#main-content h1")).toBeVisible();
    await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
    const contentSurface = page.locator(workflow.view === "list" ? ".enhe-admin-tool-table" : ".enhe-admin-tool-editor-section").first();
    await expect(contentSurface).toBeVisible();
    const background = await contentSurface.evaluate((surface) => getComputedStyle(surface).backgroundColor);
    expect(background).not.toBe("rgb(7, 16, 30)");
    if (workflow.view === "editor") {
      const contentColor = await contentSurface.evaluate((surface) => getComputedStyle(surface).color);
      expect(contentColor).not.toBe("rgb(246, 250, 255)");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("Admin tool-management routes render across all design breakpoints", async ({ page }) => {
  for (const width of [320, 390, 480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });

    for (const workflow of toolWorkflows) {
      await test.step(`${workflow.path} fits at ${width}px`, async () => {
        const response = await page.goto(workflow.path, { waitUntil: "load" });
        expect(response?.status(), `${workflow.path} response`).toBe(200);
        await expect(page.locator(".enhe-admin-tool-workflow")).toBeVisible();
        await expect(page.locator("#main-content h1")).toBeVisible();
        await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);

        const surface = page.locator(workflow.view === "list" ? ".enhe-admin-tool-table" : ".enhe-admin-tool-editor-section").first();
        await expect(surface).toBeVisible();
        const geometry = await surface.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const main = document.querySelector("#main-content");
          if (!main) throw new Error("Expected the admin main content landmark.");
          const mainRect = main.getBoundingClientRect();
          return {
            document: document.documentElement.scrollWidth,
            mainLeft: mainRect.left,
            mainRight: mainRect.right,
            surfaceLeft: rect.left,
            surfaceRight: rect.right,
            overflows: element.scrollWidth > element.clientWidth,
            overflowX: getComputedStyle(element).overflowX
          };
        });

        expect(geometry.document, `${workflow.path} document overflow`).toBeLessThanOrEqual(width);
        expect(geometry.mainLeft, `${workflow.path} main left edge`).toBeGreaterThanOrEqual(0);
        expect(geometry.mainRight, `${workflow.path} main right edge`).toBeLessThanOrEqual(width);
        expect(geometry.surfaceLeft, `${workflow.path} surface left edge`).toBeGreaterThanOrEqual(0);
        expect(geometry.surfaceRight, `${workflow.path} surface right edge`).toBeLessThanOrEqual(width);
        if (geometry.overflows) {
          expect(["auto", "scroll"], `${workflow.path} surface overflow containment`).toContain(geometry.overflowX);
        }
      });
    }
  }
});

test("Admin content-management desktop routes retain their light surfaces", async ({ page }) => {
  for (const workflow of contentManagementWorkflows) {
    await page.goto(workflow.path, { waitUntil: "load" });
    await expect(page.locator(".enhe-admin-content-management")).toBeVisible();
    await expect(page.locator("#main-content h1")).toBeVisible();
    await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
    const contentSurface = page.locator(workflow.surface).first();
    await expect(contentSurface).toBeVisible();
    const background = await contentSurface.evaluate((surface) => getComputedStyle(surface).backgroundColor);
    expect(background).not.toBe("rgb(7, 16, 30)");
    if (workflow.view === "editor") {
      const contentColor = await contentSurface.evaluate((surface) => getComputedStyle(surface).color);
      expect(contentColor).not.toBe("rgb(246, 250, 255)");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("Admin content-management lists render across all design breakpoints", async ({ page }) => {
  for (const width of [320, 390, 480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });

    for (const workflow of contentManagementWorkflows.filter((item) => item.view === "list")) {
      await test.step(`${workflow.path} fits at ${width}px`, async () => {
        const response = await page.goto(workflow.path, { waitUntil: "load" });
        expect(response?.status(), `${workflow.path} response`).toBe(200);
        await expect(page.locator(".enhe-admin-content-management")).toBeVisible();
        await expect(page.locator("#main-content h1")).toBeVisible();
          await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
          await expect(page.locator(workflow.surface).first()).toBeVisible();
        const geometry = await page.evaluate((selector) => {
          const main = document.querySelector("#main-content");
          const surface = document.querySelector(selector);
          if (!main || !surface) throw new Error(`Expected admin surface ${selector} on this route.`);
          const rect = surface.getBoundingClientRect();
          return {
            viewport: window.innerWidth,
            document: document.documentElement.scrollWidth,
            mainLeft: main.getBoundingClientRect().left,
            mainRight: main.getBoundingClientRect().right,
            surfaceLeft: rect.left,
            surfaceRight: rect.right,
            surfaceOverflows: surface.scrollWidth > surface.clientWidth,
            surfaceOverflowX: getComputedStyle(surface).overflowX
          };
        }, workflow.surface);

        expect(geometry.viewport, `${workflow.path} viewport`).toBe(width);
        expect(geometry.document, `${workflow.path} document overflow`).toBeLessThanOrEqual(width);
        expect(geometry.mainLeft, `${workflow.path} main left edge`).toBeGreaterThanOrEqual(0);
        expect(geometry.mainRight, `${workflow.path} main right edge`).toBeLessThanOrEqual(width);
        expect(geometry.surfaceLeft, `${workflow.path} surface left edge`).toBeGreaterThanOrEqual(0);
        expect(geometry.surfaceRight, `${workflow.path} surface right edge`).toBeLessThanOrEqual(width);
        if (geometry.surfaceOverflows) {
          expect(["auto", "scroll"], `${workflow.path} wide list overflow containment`).toContain(geometry.surfaceOverflowX);
        }
      });
    }
  }
});

test("Admin content-management editors render across all design breakpoints", async ({ page }) => {
  for (const width of [320, 390, 480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });

    for (const workflow of contentManagementWorkflows.filter((item) => item.view === "editor")) {
      await test.step(`${workflow.path} fits at ${width}px`, async () => {
        const response = await page.goto(workflow.path, { waitUntil: "load" });
        expect(response?.status(), `${workflow.path} response`).toBe(200);
        await expect(page.locator(".enhe-admin-content-management")).toBeVisible();
        await expect(page.locator("#main-content h1")).toBeVisible();
        await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
        await expect(page.locator(workflow.surface).first()).toBeVisible();
        await expect(page.getByRole("status").filter({ hasText: "当前还没有可关联的 AI 软件应用" })).toHaveCount(0);

        const geometry = await page.evaluate((selector) => {
          const main = document.querySelector("#main-content");
          const surface = document.querySelector(selector);
          if (!main || !surface) throw new Error(`Expected admin surface ${selector} on this route.`);
          const rect = surface.getBoundingClientRect();
          return {
            viewport: window.innerWidth,
            document: document.documentElement.scrollWidth,
            mainLeft: main.getBoundingClientRect().left,
            mainRight: main.getBoundingClientRect().right,
            surfaceLeft: rect.left,
            surfaceRight: rect.right,
            surfaceOverflows: surface.scrollWidth > surface.clientWidth,
            surfaceOverflowX: getComputedStyle(surface).overflowX
          };
        }, workflow.surface);

        expect(geometry.viewport, `${workflow.path} viewport`).toBe(width);
        expect(geometry.document, `${workflow.path} document overflow`).toBeLessThanOrEqual(width);
        expect(geometry.mainLeft, `${workflow.path} main left edge`).toBeGreaterThanOrEqual(0);
        expect(geometry.mainRight, `${workflow.path} main right edge`).toBeLessThanOrEqual(width);
        expect(geometry.surfaceLeft, `${workflow.path} surface left edge`).toBeGreaterThanOrEqual(0);
        expect(geometry.surfaceRight, `${workflow.path} surface right edge`).toBeLessThanOrEqual(width);
        if (geometry.surfaceOverflows) {
          expect(["auto", "scroll"], `${workflow.path} editor overflow containment`).toContain(geometry.surfaceOverflowX);
        }
      });
    }
  }
});

test("Admin content entrypoints fit 320px and 390px screens", async ({ page }) => {
  const mobileEntrypoints = [
    { path: "/admin/ai-news", surface: ".enhe-admin-content-table" },
    { path: "/admin/ai-skills", surface: ".enhe-admin-tool-table" },
    { path: "/admin/online-tools", surface: ".enhe-admin-tool-table" },
    { path: "/admin/skill-learning", surface: ".enhe-admin-tool-table" }
  ];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const entrypoint of mobileEntrypoints) {
      await test.step(`${entrypoint.path} fits at ${width}px`, async () => {
        await page.goto(entrypoint.path, { waitUntil: "load" });
        await expect(page.locator("#main-content h1")).toBeVisible();
        await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveAttribute("href", entrypoint.path);
        const listSurface = page.locator(entrypoint.surface);
        await expect(listSurface).toBeVisible();
        expect(await listSurface.evaluate((surface) => ({
          scrollable: surface.scrollWidth > surface.clientWidth,
          overflowX: getComputedStyle(surface).overflowX
        }))).toEqual({ scrollable: true, overflowX: "auto" });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });
    }
  }
});

test("Admin content editors and remaining lists fit mobile screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/ai-news/import");
  await expect(page.locator("#main-content h1")).toHaveText("导入 AI 资讯 HTML");
  await expect(page.locator(".enhe-admin-provenance-note")).toBeVisible();
  await page.goto("/admin/software", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-tool-table")).toBeVisible();
  expect(await page.locator(".enhe-admin-tool-table").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  await page.goto("/admin/ai-skills/new", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-tool-editor-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/admin/product-demos", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-content-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-content-records").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  await page.goto("/admin/tutorials", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-content-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-content-records").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  await page.goto("/admin/product-demos/new", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-product-demo-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/admin/tutorials/new", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-tutorial-editor-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/admin/ai-news/topics", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-content-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-content-records").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  await page.goto("/admin/ai-news/topics/new", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-topic-editor-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/admin/ai-news/keywords", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-keyword-create-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/admin/faqs", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-content-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-content-records").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  await page.goto("/admin/changelogs", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-content-records")).toBeVisible();
  expect(await page.locator(".enhe-admin-content-records").evaluate((table) => table.scrollWidth > table.clientWidth)).toBe(true);
  await page.goto("/admin/categories", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-category-create-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/admin/tags", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-tag-create-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/admin/comments", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-comment-filter-form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/admin/files", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-file-upload-panel")).toBeVisible();
  const filePageGeometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    overflowers: [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === "string" ? element.className : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth
        };
      })
      .filter((element) => element.right > window.innerWidth + 1)
      .sort((left, right) => right.right - left.right)
      .slice(0, 12)
  }));
  expect(filePageGeometry.document, JSON.stringify(filePageGeometry)).toBeLessThanOrEqual(filePageGeometry.viewport);
  await page.goto("/admin/manuals", { waitUntil: "load" });
  await expect(page.locator(".enhe-admin-manual-card").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
