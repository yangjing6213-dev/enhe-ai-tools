import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const mode = args.get("--mode");
const baseUrl = args.get("--base-url");
const output = args.get("--output");
const reference = args.get("--reference");

if (!mode || !baseUrl || !output) {
  throw new Error("Usage: --mode <baseline|natural-scan> --base-url <url> --output <path>");
}

const routes = [
  { locale: "zh", path: "/software", label: "客服" },
  { locale: "en", path: "/en/software", label: "Chat" },
];
const baselineWidths = [320, 360, 361, 390, 400, 420, 440, 480, 481, 768, 1440];

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function waitForStableLayout(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
      ),
    );
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  });
}

async function openRoute(page, path) {
  await page.goto(new URL(path, baseUrl).href, { waitUntil: "networkidle" });
  await waitForStableLayout(page);
}

async function measure(page, route, width, alignFeaturedCard) {
  await page.setViewportSize({ width, height: width <= 480 ? 844 : 900 });
  await waitForStableLayout(page);

  const featuredCard = page.locator(
    '[data-section="featured-products"] [data-catalog-card]',
  ).first();
  if (alignFeaturedCard) {
    await featuredCard.evaluate((element) =>
      element.scrollIntoView({ block: "end", inline: "nearest", behavior: "instant" }),
    );
    await waitForStableLayout(page);
  }

  return page.evaluate(({ locale, path, label, width }) => {
    const pick = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      return element;
    };
    const bounds = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: roundInPage(rect.left),
        right: roundInPage(rect.right),
        top: roundInPage(rect.top),
        bottom: roundInPage(rect.bottom),
        width: roundInPage(rect.width),
        height: roundInPage(rect.height),
      };
    };
    const roundInPage = (value) => Number(value.toFixed(6));
    const firstCard = (section) =>
      pick(`[data-section="${section}"] [data-catalog-card]`);
    const rail = (section) => pick(`[data-section="${section}"] .redesign-software-rail`);

    const launcher = pick('button[aria-controls="customer-support-panel"]');
    const launcherWrapper = launcher.parentElement;
    if (!(launcherWrapper instanceof HTMLElement)) throw new Error("Missing launcher wrapper");
    const action = pick(
      '[data-section="featured-products"] [data-catalog-card] .redesign-software-card-link',
    );
    const actionStyle = getComputedStyle(action);
    const launcherRect = launcher.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const root = document.documentElement;
    const allGrid = pick('[data-section="all-products"] .redesign-software-grid-all');
    const labelNode = Array.from(launcher.querySelectorAll("span")).find(
      (element) => element.textContent?.trim() === label,
    );
    const verticalOverlap =
      launcherRect.top < actionRect.bottom && launcherRect.bottom > actionRect.top;
    const horizontalIntersection = verticalOverlap
      ? Math.max(
          0,
          Math.min(launcherRect.right, actionRect.right) -
            Math.max(launcherRect.left, actionRect.left),
        )
      : 0;

    return {
      locale,
      path,
      width,
      cardWidths: {
        newReleases: bounds(firstCard("new-releases")).width,
        featuredProducts: bounds(firstCard("featured-products")).width,
        allProducts: bounds(firstCard("all-products")).width,
      },
      rails: {
        newReleases: {
          clientWidth: rail("new-releases").clientWidth,
          scrollWidth: rail("new-releases").scrollWidth,
        },
        featuredProducts: {
          clientWidth: rail("featured-products").clientWidth,
          scrollWidth: rail("featured-products").scrollWidth,
        },
      },
      allProductsColumns: getComputedStyle(allGrid).gridTemplateColumns.split(" ").length,
      featuredAction: {
        ...bounds(action),
        display: actionStyle.display,
        minHeight: actionStyle.minHeight,
        marginInlineEnd: actionStyle.marginInlineEnd,
        paddingInlineEnd: actionStyle.paddingInlineEnd,
        fontSize: actionStyle.fontSize,
        lineHeight: actionStyle.lineHeight,
      },
      support: {
        ...bounds(launcher),
        rightOffset: roundInPage(innerWidth - launcherRect.right),
        bottomOffset: roundInPage(innerHeight - launcherRect.bottom),
        labelVisible: Boolean(
          labelNode &&
            getComputedStyle(labelNode).display !== "none" &&
            labelNode.getBoundingClientRect().width > 0,
        ),
        ariaLabel: launcher.getAttribute("aria-label"),
        iconVisible: Boolean(
          launcher.querySelector("svg")?.getBoundingClientRect().width,
        ),
        zIndex: getComputedStyle(launcherWrapper).zIndex,
      },
      conflict: {
        verticalOverlap,
        horizontalIntersection: roundInPage(horizontalIntersection),
        horizontalGap: roundInPage(launcherRect.left - actionRect.right),
      },
      root: {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        overflow: Math.max(0, root.scrollWidth - root.clientWidth),
      },
    };
  }, { ...route, width });
}

async function collectBaseline(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const result = {
    schemaVersion: 1,
    source: "clean HEAD product layout before candidate restore",
    startHead: "f3a1f7a9e99975716e1aefd489136d1856435c4e",
    routes: {},
  };

  for (const route of routes) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openRoute(page, route.path);
    result.routes[route.path] = {};
    for (const width of baselineWidths) {
      result.routes[route.path][width] = await measure(page, route, width, false);
    }
  }
  await context.close();
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return { mode, routes: routes.length, widths: baselineWidths.length, records: 22 };
}

function assessContinuity(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.run}:${row.locale}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }
  for (const group of grouped.values()) {
    group.sort((left, right) => left.width - right.width);
    for (let index = 0; index < group.length; index += 1) {
      const current = group[index];
      const previous = group[index - 1];
      current.continuous =
        !previous ||
        (Math.abs(current.cardWidth - previous.cardWidth) <= 2 &&
          Math.abs(current.railScrollWidth - previous.railScrollWidth) <= 4);
    }
  }
}

function assessRepeatability(rows) {
  const firstRun = new Map(
    rows
      .filter((row) => row.run === 1)
      .map((row) => [`${row.locale}:${row.width}`, row]),
  );
  for (const row of rows) {
    const first = firstRun.get(`${row.locale}:${row.width}`);
    row.repeatStable = Boolean(
      first &&
        Math.abs(row.horizontalGap - first.horizontalGap) <= 0.01 &&
        Math.abs(row.cardWidth - first.cardWidth) <= 0.01 &&
        Math.abs(row.railScrollWidth - first.railScrollWidth) <= 0.01 &&
        row.rootOverflow === first.rootOverflow,
    );
  }
}

async function collectNaturalScan(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const rows = [];

  for (let run = 1; run <= 2; run += 1) {
    for (const route of routes) {
      await page.setViewportSize({ width: 480, height: 844 });
      await openRoute(page, route.path);
      for (let width = 361; width <= 480; width += 1) {
        const value = await measure(page, route, width, true);
        rows.push({
          run,
          locale: route.locale,
          path: route.path,
          width,
          supportLeft: value.support.left,
          supportRight: value.support.right,
          actionLeft: value.featuredAction.left,
          actionRight: value.featuredAction.right,
          verticalOverlap: value.conflict.verticalOverlap,
          horizontalIntersection: value.conflict.horizontalIntersection,
          horizontalGap: value.conflict.horizontalGap,
          cardWidth: value.cardWidths.featuredProducts,
          railScrollWidth: value.rails.featuredProducts.scrollWidth,
          rootOverflow: value.root.overflow,
        });
      }
    }
  }
  await context.close();

  assessContinuity(rows);
  assessRepeatability(rows);
  const safeAtWidth = (width) =>
    rows
      .filter((row) => row.width >= width)
      .every(
        (row) =>
          (!row.verticalOverlap ||
            (row.horizontalIntersection === 0 && row.horizontalGap >= 8)) &&
          row.rootOverflow === 0 &&
          row.continuous &&
          row.repeatStable,
      );
  const naturalSafeWidth = Array.from({ length: 120 }, (_, index) => 361 + index).find(
    safeAtWidth,
  );
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ].join("\n");
  writeFileSync(output, `${csv}\n`, "utf8");

  return {
    mode,
    records: rows.length,
    scanRuns: 2,
    naturalSafeWidth: naturalSafeWidth ?? null,
    firstUnsafe: rows
      .filter(
        (row) =>
          row.verticalOverlap &&
          (row.horizontalIntersection > 0 || row.horizontalGap < 8),
      )
      .slice(0, 4),
    firstSafePerLocale: Object.fromEntries(
      routes.map((route) => [
        route.locale,
        rows.find(
          (row) =>
            row.run === 1 &&
            row.locale === route.locale &&
            row.verticalOverlap &&
            row.horizontalIntersection === 0 &&
            row.horizontalGap >= 8,
        )?.width ?? null,
      ]),
    ),
  };
}

function readNaturalReference() {
  if (!reference) throw new Error("green-scan requires --reference");
  const lines = readFileSync(reference, "utf8").trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return new Map(
    lines
      .slice(1)
      .map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])))
      .filter((row) => row.run === "1")
      .map((row) => [`${row.locale}:${row.width}`, row]),
  );
}

async function collectGreenScan(browser) {
  const naturalReference = readNaturalReference();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const rows = [];

  for (const route of routes) {
    await page.setViewportSize({ width: 480, height: 844 });
    await openRoute(page, route.path);
    for (let width = 320; width <= 480; width += 1) {
      const value = await measure(page, route, width, true);
      const natural = naturalReference.get(`${route.locale}:${width}`);
      const naturalLayoutMatch = natural
        ? Math.abs(value.cardWidths.featuredProducts - Number(natural.cardWidth)) <= 0.01 &&
          Math.abs(value.rails.featuredProducts.scrollWidth - Number(natural.railScrollWidth)) <= 0.01 &&
          (width <= 420 ||
            Math.abs(value.featuredAction.right - Number(natural.actionRight)) <= 0.01)
        : "sampled-in-clean-baseline";
      const safeZoneActive = value.featuredAction.marginInlineEnd === "52px";
      const pass =
        Math.abs(value.support.width - 44) <= 1 &&
        Math.abs(value.support.height - 44) <= 1 &&
        !value.support.labelVisible &&
        value.support.iconVisible &&
        value.support.ariaLabel === route.label &&
        value.conflict.horizontalIntersection === 0 &&
        value.conflict.horizontalGap >= 8 &&
        value.root.overflow === 0 &&
        safeZoneActive === (width <= 420) &&
        naturalLayoutMatch !== false;
      rows.push({
        locale: route.locale,
        path: route.path,
        viewportWidth: width,
        supportWidth: value.support.width,
        supportHeight: value.support.height,
        supportLeft: value.support.left,
        supportRight: value.support.right,
        visibleLabel: value.support.labelVisible,
        iconVisible: value.support.iconVisible,
        ariaLabel: value.support.ariaLabel,
        featuredActionRight: value.featuredAction.right,
        horizontalGap: value.conflict.horizontalGap,
        horizontalIntersection: value.conflict.horizontalIntersection,
        cardWidth: value.cardWidths.featuredProducts,
        railScrollWidth: value.rails.featuredProducts.scrollWidth,
        rootOverflow: value.root.overflow,
        marginInlineEnd: value.featuredAction.marginInlineEnd,
        minHeight: value.featuredAction.minHeight,
        safeZoneActive,
        naturalLayoutMatch,
        pass,
      });
    }
  }
  await context.close();

  const headers = Object.keys(rows[0]);
  writeFileSync(
    output,
    `${[
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
    ].join("\n")}\n`,
    "utf8",
  );
  return {
    mode,
    records: rows.length,
    failed: rows.filter((row) => !row.pass).length,
    minGap: Math.min(...rows.map((row) => row.horizontalGap)),
    intersections: rows.filter((row) => row.horizontalIntersection > 0).length,
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const result =
    mode === "baseline"
      ? await collectBaseline(browser)
      : mode === "natural-scan"
        ? await collectNaturalScan(browser)
        : mode === "green-scan"
          ? await collectGreenScan(browser)
        : null;
  if (!result) throw new Error(`Unsupported mode: ${mode}`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await browser.close();
}
