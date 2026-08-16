import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const mode = args.get("--mode");
const baseUrl = args.get("--base-url");
const output = args.get("--output");
const reference = args.get("--reference");
const from = Number(args.get("--from"));
const to = Number(args.get("--to"));
const runs = Number(args.get("--runs") ?? "1");
const reserve = Number(args.get("--reserve") ?? "0");
const widths = (args.get("--widths") ?? "")
  .split(",")
  .filter(Boolean)
  .map(Number);
const enabled = new Set(
  (args.get("--enabled") ?? "featured,all-products")
    .split(",")
    .filter(Boolean),
);

if (!mode || !baseUrl || !output) {
  throw new Error(
    "Usage: --mode <support-widths|natural-targets|simulate-text-scan|production-scan> --base-url <url> --output <path>",
  );
}

const localeRoutes = [
  {
    locale: "zh",
    label: "客服",
    software: "/software",
    softwarePageTwo: "/software?page=2",
    home: "/",
  },
  {
    locale: "en",
    label: "Chat",
    software: "/en/software",
    softwarePageTwo: "/en/software?page=2",
    home: "/en",
  },
];

const textSupportModeMinWidth = 484;
const iconSupportModeMaxWidth = textSupportModeMinWidth - 1;
const supportWidths = [481, 483, 484, 600, 768, 1024, 1280, 1440];
const styleId = "phase2c21r4-test-only-exclusion";

function productionScanWidths() {
  const values = [];
  for (let width = 320; width <= 768; width += 1) values.push(width);
  for (let width = 769; width <= 1024; width += 2) values.push(width);
  for (let width = 1025; width <= 1440; width += 4) values.push(width);
  values.push(767, 768, 769, 979, 980, 981, 1023, 1024, 1025, 1439, 1440);
  return [...new Set(values)].sort((left, right) => left - right);
}

function csvValue(value) {
  const text = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(rows) {
  const headers = Object.keys(rows[0] ?? {});
  writeFileSync(
    output,
    `${[
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
    ].join("\n")}\n`,
    "utf8",
  );
}

function readBaseline() {
  return reference ? JSON.parse(readFileSync(reference, "utf8")) : null;
}

function summarizeTargetCoverage(measurements, plans) {
  const inspectedTargetTypes = [...new Set(plans.map((plan) => plan.type))];
  const expectedTargetTypes = [
    ...new Set(
      plans
        .filter((plan) => plan.requireRelevant !== false)
        .map((plan) => plan.type),
    ),
  ];
  const validGeometry = (measurement) =>
    [measurement.gap, measurement.intersection, measurement.verticalIntersection].every(
      Number.isFinite,
    );
  const targetSampleCounts = Object.fromEntries(
    inspectedTargetTypes.map((type) => [
      type,
      measurements.filter((measurement) => measurement.type === type && validGeometry(measurement))
        .length,
    ]),
  );
  const relevantTargetSampleCounts = Object.fromEntries(
    inspectedTargetTypes.map((type) => [
      type,
      measurements.filter(
        (measurement) =>
          measurement.type === type &&
          validGeometry(measurement) &&
          measurement.verticalIntersection > 0,
      ).length,
    ]),
  );
  const missingTargetTypes = inspectedTargetTypes.filter(
    (type) => targetSampleCounts[type] === 0,
  );
  const missingRelevantTargetTypes = expectedTargetTypes.filter(
    (type) => relevantTargetSampleCounts[type] === 0,
  );
  const invalidGeometrySamples = measurements.filter(
    (measurement) => !validGeometry(measurement),
  ).length;

  return {
    inspectedTargetTypes: inspectedTargetTypes.join("|"),
    expectedTargetTypes: expectedTargetTypes.join("|"),
    measuredTargetTypes: Object.entries(targetSampleCounts)
      .filter(([, count]) => count > 0)
      .map(([type]) => type)
      .join("|"),
    targetSampleCounts,
    relevantTargetSampleCounts,
    missingTargetTypes: missingTargetTypes.join("|"),
    missingRelevantTargetTypes: missingRelevantTargetTypes.join("|"),
    validGeometrySamples: measurements.length - invalidGeometrySamples,
    relevantGeometrySamples: Object.values(relevantTargetSampleCounts).reduce(
      (sum, count) => sum + count,
      0,
    ),
    invalidGeometrySamples,
    pass:
      missingTargetTypes.length === 0 &&
      missingRelevantTargetTypes.length === 0 &&
      invalidGeometrySamples === 0,
  };
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
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

async function openRoute(page, path) {
  await page.goto(new URL(path, baseUrl).href, { waitUntil: "networkidle" });
  await waitForStableLayout(page);
}

function simulationCss(exclusionReserve) {
  const sectionNames = [];
  if (enabled.has("new-releases")) sectionNames.push("new-releases");
  if (enabled.has("featured")) sectionNames.push("featured-products");
  if (enabled.has("all-products")) sectionNames.push("all-products");
  const sectionSelectors = sectionNames.map(
    (section) => `.redesign-software-section[data-section="${section}"]`,
  );
  const selectorsFor = (suffix) =>
    sectionSelectors.map((section) => `${section} ${suffix}`).join(",\n");
  const footerRules = enabled.has("footer")
    ? `
    @media (max-width: 767px) {
      .footer-grid nav,
      .footer-bottom p:last-child {
        margin-inline-end: var(--phase2c21r4-test-reserve);
      }
    }
    @media (min-width: 768px) {
      .footer-grid nav:last-child,
      .footer-bottom p:last-child {
        margin-inline-end: var(--phase2c21r4-test-reserve);
      }
    }
  `
    : "";
  const homeControlRules = enabled.has("home-control")
    ? `
    @media (min-width: 768px) {
      .redesign-home-product-stage:has(
        > .redesign-home-product-control
      ) {
        grid-template-columns:
          44px
          minmax(0, 1fr)
          calc(44px + var(--phase2c21r4-test-reserve));
      }
      .redesign-home-product-control {
        justify-self: start;
      }
    }
  `
    : "";

  return `
    :root { --phase2c21r4-test-reserve: ${exclusionReserve}px; }
    .enhe-redesign-production {
      --support-exclusion-current: var(--phase2c21r4-test-reserve) !important;
    }
    @media (width < 768px) {
      .enhe-redesign-production
        .customer-support-widget[data-support-open="false"] {
        width: calc(100vw - 2rem) !important;
        max-width: 360px !important;
        height: auto !important;
      }
      .enhe-redesign-production .customer-support-launcher {
        width: auto !important;
        min-width: 0 !important;
        height: auto !important;
        min-height: 0 !important;
        gap: 0.5rem !important;
        padding: 0.75rem 1rem !important;
      }
      .enhe-redesign-production .customer-support-launcher-label {
        display: inline !important;
      }
    }
    @media (max-width: 767px) {
      ${selectorsFor("[data-catalog-card] .redesign-software-card-link")} {
        min-height: 44px;
        margin-inline-end: var(--phase2c21r4-test-reserve);
      }
    }
    @media (min-width: 768px) and (max-width: 768px) {
      ${selectorsFor("[data-catalog-card]:nth-child(2n) .redesign-software-card-link")} {
        min-height: 44px;
        margin-inline-end: var(--phase2c21r4-test-reserve);
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      ${selectorsFor("[data-catalog-card]:nth-child(3n) .redesign-software-card-link")} {
        min-height: 44px;
        margin-inline-end: var(--phase2c21r4-test-reserve);
      }
    }
    @media (min-width: 1025px) {
      ${selectorsFor("[data-catalog-card]:nth-child(4n) .redesign-software-card-link")} {
        min-height: 44px;
        margin-inline-end: var(--phase2c21r4-test-reserve);
      }
    }
    ${footerRules}
    ${homeControlRules}
  `;
}

function pagePlans(route) {
  return [
    {
      path: route.software,
      pageKind: "software",
      groups: [
        { targetType: "new-releases", section: "new-releases" },
        { targetType: "featured", section: "featured-products" },
        { targetType: "all-products", section: "all-products" },
        { targetType: "load-more", selector: '.redesign-software-load-row a[rel="next"]' },
        { targetType: "footer-link", selector: ".redesign-footer a" },
      ],
    },
    {
      path: route.softwarePageTwo,
      pageKind: "pagination",
      groups: [
        { targetType: "previous", selector: '.redesign-software-load-row a[rel="prev"]' },
        { targetType: "next", selector: '.redesign-software-load-row a[rel="next"]' },
      ],
    },
    {
      path: route.home,
      pageKind: "home",
      groups: [
        { targetType: "home-cta", selector: ".redesign-home-cta" },
        {
          targetType: "home-brand-cta",
          selector: ".redesign-home-brand-value-cta",
        },
        { targetType: "home-product-control", selector: ".redesign-home-product-control" },
        { targetType: "home-review-control", selector: ".redesign-home-reviews-control" },
        { targetType: "home-footer-link", selector: ".redesign-footer a" },
      ],
    },
  ];
}

async function measureGroups(page, groups, metadata, simulated) {
  return page.evaluate(
    ({ groups, metadata, simulated, styleId }) => {
      const round = (value) => Number(value.toFixed(6));
      const bounds = (element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: round(rect.left),
          right: round(rect.right),
          top: round(rect.top),
          bottom: round(rect.bottom),
          width: round(rect.width),
          height: round(rect.height),
        };
      };
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const layoutSnapshot = () => {
        const firstCardWidth = (section) =>
          bounds(
            document.querySelector(
              `[data-section="${section}"] [data-catalog-card]:not([hidden])`,
            ),
          ).width;
        const railWidth = (section) => {
          const rail = document.querySelector(
            `[data-section="${section}"] .redesign-software-grid`,
          );
          return rail instanceof HTMLElement ? rail.scrollWidth : 0;
        };
        const allGrid = document.querySelector(
          '[data-section="all-products"] .redesign-software-grid-all',
        );
        return {
          newCardWidth: document.querySelector('[data-section="new-releases"]')
            ? firstCardWidth("new-releases")
            : 0,
          featuredCardWidth: document.querySelector('[data-section="featured-products"]')
            ? firstCardWidth("featured-products")
            : 0,
          allProductsCardWidth: document.querySelector('[data-section="all-products"]')
            ? firstCardWidth("all-products")
            : 0,
          newRailWidth: railWidth("new-releases"),
          featuredRailWidth: railWidth("featured-products"),
          allProductsGridWidth:
            allGrid instanceof HTMLElement ? bounds(allGrid).width : 0,
        };
      };
      const style = document.getElementById(styleId);
      const sheet = style?.sheet;
      if (simulated && sheet) sheet.disabled = true;
      const baseline = layoutSnapshot();
      if (simulated && sheet) sheet.disabled = false;
      const styled = layoutSnapshot();
      const launcher = document.querySelector(
        'button[aria-controls="customer-support-panel"]',
      );
      if (!(launcher instanceof HTMLElement)) {
        throw new Error("Missing customer support launcher");
      }
      const productionRoot = document.querySelector(".enhe-redesign-production");
      if (!(productionRoot instanceof HTMLElement)) {
        throw new Error("Missing production root");
      }
      const productionStyle = getComputedStyle(productionRoot);
      const supportLabel = launcher.querySelector(".customer-support-launcher-label");
      const supportLabelVisible = Boolean(
        supportLabel instanceof HTMLElement &&
          getComputedStyle(supportLabel).display !== "none" &&
          supportLabel.getBoundingClientRect().width > 0,
      );
      const supportSize = bounds(launcher);
      const currentReserve =
        Number.parseFloat(
          productionStyle.getPropertyValue("--support-exclusion-current"),
        ) || 0;

      const candidatesFor = (group) => {
        if (!group.section) {
          return Array.from(document.querySelectorAll(group.selector)).filter(
            (element) => element instanceof HTMLElement && visible(element),
          );
        }

        const section = document.querySelector(`[data-section="${group.section}"]`);
        if (!(section instanceof HTMLElement)) return [];
        const layout = section.querySelector(".redesign-software-grid");
        const cards = Array.from(
          section.querySelectorAll("[data-catalog-card]:not([hidden])"),
        ).filter((element) => element instanceof HTMLElement && visible(element));
        if (!(layout instanceof HTMLElement)) return [];
        if (getComputedStyle(layout).display === "flex") {
          return cards
            .map((card) => card.querySelector(".redesign-software-card-link"))
            .filter((element) => element instanceof HTMLElement && visible(element));
        }
        const columns = getComputedStyle(layout).gridTemplateColumns
          .split(" ")
          .filter(Boolean).length;
        const rightEdge = cards.filter((_, index) => (index + 1) % columns === 0);
        const selected = rightEdge.length ? rightEdge : cards.slice(-1);
        return selected
          .map((card) => card.querySelector(".redesign-software-card-link"))
          .filter((element) => element instanceof HTMLElement && visible(element));
      };

      return groups.map((group) => {
        const candidates = candidatesFor(group);
        const measurements = candidates.map((target, targetIndex) => {
          const card = target.closest("[data-catalog-card]");
          const rail = card?.closest(".redesign-software-rail");
          if (rail instanceof HTMLElement && card instanceof HTMLElement) {
            const firstCard = rail.querySelector("[data-catalog-card]:not([hidden])");
            if (firstCard instanceof HTMLElement) {
              rail.scrollLeft = card.offsetLeft - firstCard.offsetLeft;
            }
          }
          target.scrollIntoView({
            block: "end",
            inline: "nearest",
            behavior: "instant",
          });
          const supportRect = bounds(launcher);
          const targetRect = bounds(target);
          const horizontalIntersection = Math.max(
            0,
            Math.min(supportRect.right, targetRect.right) -
              Math.max(supportRect.left, targetRect.left),
          );
          const verticalIntersection = Math.max(
            0,
            Math.min(supportRect.bottom, targetRect.bottom) -
              Math.max(supportRect.top, targetRect.top),
          );
          const targetStyle = getComputedStyle(target);
          const marginInlineEnd = Number.parseFloat(targetStyle.marginInlineEnd) || 0;
          const marginInlineStart = Number.parseFloat(targetStyle.marginInlineStart) || 0;
          const paddingInlineEnd = Number.parseFloat(targetStyle.paddingInlineEnd) || 0;
          const grid = target.closest(".redesign-software-grid");
          return {
            targetIndex,
            supportRect,
            targetRect,
            horizontalGap: round(supportRect.left - targetRect.right),
            horizontalIntersection: round(horizontalIntersection),
            verticalIntersection: round(verticalIntersection),
            targetClientWidth: target.clientWidth,
            targetScrollWidth: target.scrollWidth,
            targetClientHeight: target.clientHeight,
            targetScrollHeight: target.scrollHeight,
            textClipped:
              target.scrollWidth > target.clientWidth + 0.5 ||
              target.scrollHeight > target.clientHeight + 0.5,
            marginInlineEnd: round(marginInlineEnd),
            marginInlineStart: round(marginInlineStart),
            paddingInlineEnd: round(paddingInlineEnd),
            cardWidth: card instanceof HTMLElement ? bounds(card).width : 0,
            railWidth: rail instanceof HTMLElement ? rail.scrollWidth : 0,
            gridWidth: grid instanceof HTMLElement ? bounds(grid).width : 0,
          };
        });
        const worst = measurements.sort((left, right) => {
          const leftScore = left.verticalIntersection > 0 ? left.horizontalGap : 100000;
          const rightScore = right.verticalIntersection > 0 ? right.horizontalGap : 100000;
          return leftScore - rightScore;
        })[0];
        const rootOverflow = Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        const layoutDelta = Object.fromEntries(
          Object.keys(baseline).map((key) => [key, round(styled[key] - baseline[key])]),
        );
        const layoutChanged = Object.values(layoutDelta).some(
          (value) => Math.abs(value) > 0.01,
        );
        const geometryPass = Boolean(
          worst &&
            (worst.verticalIntersection === 0 ||
              (worst.horizontalIntersection === 0 && worst.horizontalGap >= 8)),
        );
        return {
          run: metadata.run,
          viewport: metadata.viewport,
          locale: metadata.locale,
          path: metadata.path,
          pageKind: metadata.pageKind,
          targetType: group.targetType,
          targetIndex: worst?.targetIndex ?? -1,
          supportRect: worst?.supportRect ?? null,
          targetRect: worst?.targetRect ?? null,
          gap: worst?.horizontalGap ?? null,
          intersection: worst?.horizontalIntersection ?? null,
          verticalIntersection: worst?.verticalIntersection ?? null,
          targetClientWidth: worst?.targetClientWidth ?? 0,
          targetScrollWidth: worst?.targetScrollWidth ?? 0,
          targetClientHeight: worst?.targetClientHeight ?? 0,
          targetScrollHeight: worst?.targetScrollHeight ?? 0,
          rootOverflow,
          textClipped: worst?.textClipped ?? true,
          supportMode: supportLabelVisible ? "text" : "icon",
          supportWidth: supportSize.width,
          supportHeight: supportSize.height,
          exclusionReserve: currentReserve,
          targetMarginInlineEnd: worst?.marginInlineEnd ?? 0,
          targetMarginInlineStart: worst?.marginInlineStart ?? 0,
          targetPaddingInlineEnd: worst?.paddingInlineEnd ?? 0,
          cardWidth: worst?.cardWidth ?? 0,
          railWidth: worst?.railWidth ?? 0,
          gridWidth: worst?.gridWidth ?? 0,
          layoutChanged,
          candidateCount: candidates.length,
          pass:
            geometryPass &&
            Boolean(worst) &&
            !worst.textClipped &&
            rootOverflow === 0 &&
            !layoutChanged,
        };
      });
    },
    { groups, metadata, simulated, styleId },
  );
}

function annotateRepeatability(rows) {
  const firstRun = new Map(
    rows
      .filter((row) => row.run === 1)
      .map((row) => [
        `${row.locale}:${row.path}:${row.viewport}:${row.targetType}`,
        row,
      ]),
  );
  for (const row of rows) {
    const first = firstRun.get(
      `${row.locale}:${row.path}:${row.viewport}:${row.targetType}`,
    );
    row.repeatStable = Boolean(
      first &&
        row.gap === first.gap &&
        row.intersection === first.intersection &&
        row.verticalIntersection === first.verticalIntersection &&
        row.rootOverflow === first.rootOverflow &&
        row.textClipped === first.textClipped &&
        row.layoutChanged === first.layoutChanged,
    );
    row.pass = row.pass && row.repeatStable;
  }
}

async function collectSupportWidths(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const rows = [];
  for (const route of localeRoutes) {
    await openRoute(page, route.software);
    for (const viewport of supportWidths) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await waitForStableLayout(page);
      rows.push(
        await page.evaluate(({ locale, path, viewport, label }) => {
          const button = document.querySelector(
            'button[aria-controls="customer-support-panel"]',
          );
          if (!(button instanceof HTMLElement)) throw new Error("Missing launcher");
          const rect = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          return {
            locale,
            path,
            viewport,
            buttonWidth: Number(rect.width.toFixed(6)),
            buttonHeight: Number(rect.height.toFixed(6)),
            label,
            right: Number((innerWidth - rect.right).toFixed(6)),
            bottom: Number((innerHeight - rect.bottom).toFixed(6)),
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
          };
        }, { ...route, path: route.software, viewport }),
      );
    }
  }
  await context.close();
  writeCsv(rows);
  const maximum = Math.max(...rows.map((row) => row.buttonWidth));
  return {
    mode,
    records: rows.length,
    maximum,
    expandedReserve: Math.ceil((maximum + 8) / 4) * 4,
  };
}

async function collectTargetScan(browser, simulated) {
  const scanWidths = widths.length
    ? widths
    : mode === "production-scan"
      ? productionScanWidths()
      : Array.from({ length: to - from + 1 }, (_, index) => from + index);
  if (
    scanWidths.some((width) => !Number.isInteger(width) || width < 320) ||
    !Number.isInteger(runs) ||
    runs < 1 ||
    (simulated && runs < 2) ||
    (simulated && (!Number.isFinite(reserve) || reserve <= 0))
  ) {
    throw new Error("Invalid scan widths, runs, or reserve");
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const rows = [];

  for (let run = 1; run <= runs; run += 1) {
    for (const route of localeRoutes) {
      for (const plan of pagePlans(route)) {
        await openRoute(page, plan.path);
        if (simulated) {
          const style = await page.addStyleTag({ content: simulationCss(reserve) });
          await style.evaluate((element, id) => {
            element.id = id;
          }, styleId);
        }
        for (const viewport of scanWidths) {
          await page.setViewportSize({
            width: viewport,
            height: viewport <= 480 ? 844 : 900,
          });
          rows.push(
            ...(await measureGroups(
              page,
              plan.groups,
              {
                run,
                viewport,
                locale: route.locale,
                path: plan.path,
                pageKind: plan.pageKind,
              },
              simulated,
            )),
          );
        }
      }
    }
  }
  await context.close();
  annotateRepeatability(rows);
  writeCsv(rows);
  const failures = rows.filter((row) => !row.pass);
  const collisionRows = rows.filter(
    (row) =>
      row.verticalIntersection > 0 &&
      (row.intersection > 0 || row.gap < 8),
  );
  const safeAtWidth = (width) =>
    rows.filter((row) => row.viewport >= width).every((row) => row.pass);
  const safeMinimum = scanWidths
    .slice()
    .sort((left, right) => left - right)
    .find(safeAtWidth);
  return {
    mode,
    records: rows.length,
    runs,
    failures: failures.length,
    collisions: collisionRows.length,
    collisionTargetTypes: [...new Set(collisionRows.map((row) => row.targetType))],
    textClipping: rows.filter((row) => row.textClipped).length,
    rootOverflow: rows.filter((row) => row.rootOverflow > 0).length,
    layoutChanges: rows.filter((row) => row.layoutChanged).length,
    repeatInstability: rows.filter((row) => !row.repeatStable).length,
    minimumGap: Math.min(
      ...rows
        .filter((row) => row.verticalIntersection > 0 && row.gap !== null)
        .map((row) => row.gap),
    ),
    safeMinimum: safeMinimum ?? null,
  };
}

const matrixWidths = [320, 360, 390, 480, 483, 484, 767, 768, 1024, 1440];

async function measureAllProductsWithoutExclusion(page) {
  return page.evaluate(async () => {
    const root = document.querySelector(".enhe-redesign-production");
    const grid = document.querySelector(
      '[data-section="all-products"] .redesign-software-grid-all',
    );
    const card = grid?.querySelector("[data-catalog-card]:not([hidden])");
    if (
      !(root instanceof HTMLElement) ||
      !(grid instanceof HTMLElement) ||
      !(card instanceof HTMLElement)
    ) {
      throw new Error("Missing all-products baseline target");
    }

    if (!document.getElementById("phase2c21r4-layout-baseline")) {
      const style = document.createElement("style");
      style.id = "phase2c21r4-layout-baseline";
      style.textContent = `
        html body .enhe-redesign-production[data-r4-layout-baseline="true"]
          [data-section="all-products"]
          .redesign-software-card-link[data-support-exclusion="all-products"] {
          margin-inline-start: 0;
          margin-inline-end: 0;
        }
      `;
      document.head.append(style);
    }

    root.dataset.r4LayoutBaseline = "true";
    try {
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      return {
        cardWidth: card.getBoundingClientRect().width,
        gridWidth: grid.getBoundingClientRect().width,
      };
    } finally {
      delete root.dataset.r4LayoutBaseline;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    }
  });
}

async function collectAllProductsMatrix(browser) {
  const baseline = readBaseline();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const rows = [];

  for (const route of localeRoutes) {
    for (const viewport of matrixWidths) {
      await page.setViewportSize({ width: viewport, height: viewport <= 480 ? 844 : 900 });
      for (const pageNumber of [1, 2, 3]) {
        const path = pageNumber === 1 ? route.software : `${route.software}?page=${pageNumber}`;
        await openRoute(page, path);
        const cardCount = await page
          .locator('[data-section="all-products"] [data-catalog-card]:not([hidden])')
          .count();
        const expectedPageCount = pageNumber < 3 ? 12 : 1;
        const capturedBaselineWidth =
          baseline?.routes?.[route.software]?.[String(viewport)]?.cardWidths?.allProducts ??
          null;
        const measuredBaseline = await measureAllProductsWithoutExclusion(page);
        const baselineWidth = capturedBaselineWidth ?? measuredBaseline.cardWidth;
        const baselineSource =
          capturedBaselineWidth === null
            ? "test-only-exclusion-disabled"
            : "pre-implementation-capture";

        for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
          const card = page
            .locator('[data-section="all-products"] [data-catalog-card]:not([hidden])')
            .nth(cardIndex);
          const action = card.locator(".redesign-software-card-link");
          await action.evaluate((element) =>
            element.scrollIntoView({ block: "end", inline: "nearest", behavior: "instant" }),
          );
          await waitForStableLayout(page);
          const row = await page.evaluate(
              ({
                cardIndex,
                cardCount,
                expectedPageCount,
                locale,
                pageNumber,
                path,
                viewport,
                baselineWidth,
                baselineGridWidth,
                baselineSource,
              }) => {
                const round = (value) => Number(value.toFixed(6));
                const cards = Array.from(
                  document.querySelectorAll(
                    '[data-section="all-products"] [data-catalog-card]:not([hidden])',
                  ),
                ).filter((element) => element instanceof HTMLElement);
                const card = cards[cardIndex];
                const action = card?.querySelector(".redesign-software-card-link");
                const launcher = document.querySelector(
                  'button[aria-controls="customer-support-panel"]',
                );
                const grid = document.querySelector(
                  '[data-section="all-products"] .redesign-software-grid-all',
                );
                const root = document.querySelector(".enhe-redesign-production");
                if (
                  !(card instanceof HTMLElement) ||
                  !(action instanceof HTMLElement) ||
                  !(launcher instanceof HTMLElement) ||
                  !(grid instanceof HTMLElement) ||
                  !(root instanceof HTMLElement)
                ) {
                  throw new Error("Missing all-products matrix target");
                }
                const bounds = (element) => {
                  const rect = element.getBoundingClientRect();
                  return {
                    left: round(rect.left),
                    right: round(rect.right),
                    top: round(rect.top),
                    bottom: round(rect.bottom),
                    width: round(rect.width),
                    height: round(rect.height),
                  };
                };
                const supportRect = bounds(launcher);
                const actionRect = bounds(action);
                const cardRect = bounds(card);
                const gridRect = bounds(grid);
                const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
                const isRightColumn = columns === 1 || (cardIndex + 1) % columns === 0;
                const actionStyle = getComputedStyle(action);
                const reserve =
                  Number.parseFloat(
                    getComputedStyle(root).getPropertyValue("--support-exclusion-current"),
                  ) || 0;
                const marginInlineEnd = Number.parseFloat(actionStyle.marginInlineEnd) || 0;
                const verticalIntersection = Math.max(
                  0,
                  Math.min(supportRect.bottom, actionRect.bottom) -
                    Math.max(supportRect.top, actionRect.top),
                );
                const intersection = Math.max(
                  0,
                  Math.min(supportRect.right, actionRect.right) -
                    Math.max(supportRect.left, actionRect.left),
                );
                const gap = round(supportRect.left - actionRect.right);
                const textClipped =
                  action.scrollWidth > action.clientWidth + 0.5 ||
                  action.scrollHeight > action.clientHeight + 0.5;
                const peerCardWidthMatch = cards.every(
                  (peer) =>
                    peer instanceof HTMLElement &&
                    Math.abs(peer.getBoundingClientRect().width - cardRect.width) <= 0.01,
                );
                const baselineCardWidthMatch =
                  Math.abs(cardRect.width - Number(baselineWidth)) <= 0.01;
                const baselineGridWidthMatch =
                  Math.abs(gridRect.width - Number(baselineGridWidth)) <= 0.01;
                const exclusionPresent = Math.abs(marginInlineEnd - reserve) <= 0.01;
                const unexpectedExclusion = !isRightColumn && marginInlineEnd > 0.01;
                const geometryPass =
                  verticalIntersection === 0 || (intersection === 0 && gap >= 8);
                const rootOverflow = Math.max(
                  0,
                  document.documentElement.scrollWidth -
                    document.documentElement.clientWidth,
                );
                return {
                  locale,
                  path,
                  page: pageNumber,
                  viewport,
                  cardIndex: cardIndex + 1,
                  pageCardCount: cardCount,
                  expectedPageCount,
                  columns,
                  isRightColumn,
                  dataScope: action.getAttribute("data-support-exclusion"),
                  exclusionReserve: reserve,
                  marginInlineEnd: round(marginInlineEnd),
                  exclusionMissing: isRightColumn && !exclusionPresent,
                  unexpectedExclusion,
                  supportRect,
                  actionRect,
                  cardWidth: cardRect.width,
                  baselineCardWidth: baselineWidth,
                  baselineCardWidthMatch,
                  gridWidth: gridRect.width,
                  baselineGridWidth,
                  baselineGridWidthMatch,
                  baselineSource,
                  peerCardWidthMatch,
                  gap,
                  intersection: round(intersection),
                  verticalIntersection: round(verticalIntersection),
                  actionHeight: actionRect.height,
                  textClipped,
                  href: action.getAttribute("href"),
                  rootOverflow,
                  pass:
                    cardCount === expectedPageCount &&
                    action.getAttribute("data-support-exclusion") === "all-products" &&
                    (isRightColumn ? exclusionPresent : !unexpectedExclusion) &&
                    geometryPass &&
                    actionRect.height >= 44 &&
                    !textClipped &&
                    Boolean(action.getAttribute("href")) &&
                    rootOverflow === 0 &&
                    peerCardWidthMatch &&
                    baselineCardWidthMatch === true &&
                    baselineGridWidthMatch === true,
                };
              },
              {
                cardIndex,
                cardCount,
                expectedPageCount,
                locale: route.locale,
                pageNumber,
                path,
                viewport,
                baselineWidth,
                baselineGridWidth: measuredBaseline.gridWidth,
                baselineSource,
              },
            );
          rows.push(row);
        }
      }
    }
  }
  await context.close();
  writeCsv(rows);
  return {
    mode,
    records: rows.length,
    failed: rows.filter((row) => !row.pass).length,
    rightColumnExclusionMissing: rows.filter((row) => row.exclusionMissing).length,
    nonRightColumnUnexpectedExclusion: rows.filter((row) => row.unexpectedExclusion).length,
    pageCountFailures: rows.filter((row) => row.pageCardCount !== row.expectedPageCount).length,
  };
}

async function measureRailWithoutExclusion(page, sectionId) {
  return page.evaluate(async (targetSectionId) => {
    const root = document.querySelector(".enhe-redesign-production");
    const section = document.querySelector(`[data-section="${targetSectionId}"]`);
    const rail = section?.querySelector(".redesign-software-rail");
    const card = rail?.querySelector("[data-catalog-card]:not([hidden])");
    if (
      !(root instanceof HTMLElement) ||
      !(rail instanceof HTMLElement) ||
      !(card instanceof HTMLElement)
    ) {
      throw new Error("Missing rail baseline target");
    }

    if (!document.getElementById("phase2c21r4-layout-baseline")) {
      const style = document.createElement("style");
      style.id = "phase2c21r4-layout-baseline";
      style.textContent = `
        html body .enhe-redesign-production[data-r4-layout-baseline="true"]
          .redesign-software-section
          .redesign-software-card-link[data-support-exclusion] {
          margin-inline-start: 0;
          margin-inline-end: 0;
        }
      `;
      document.head.append(style);
    }

    root.dataset.r4LayoutBaseline = "true";
    try {
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      return {
        cardWidth: card.getBoundingClientRect().width,
        railScrollWidth: rail.scrollWidth,
      };
    } finally {
      delete root.dataset.r4LayoutBaseline;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    }
  }, sectionId);
}

async function collectRailMatrix(browser) {
  const baseline = readBaseline();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const rows = [];
  const sections = [
    { id: "new-releases", railType: "new" },
    { id: "featured-products", railType: "featured" },
  ];

  for (const route of localeRoutes) {
    for (const viewport of matrixWidths.filter((width) => width !== 360)) {
      await page.setViewportSize({ width: viewport, height: viewport <= 480 ? 844 : 900 });
      await openRoute(page, route.software);
      for (const section of sections) {
        const rail = page.locator(
          `[data-section="${section.id}"] .redesign-software-rail`,
        );
        const cards = rail.locator("[data-catalog-card]:not([hidden])");
        const cardCount = await cards.count();
        const initialScroll = await rail.evaluate((element) => element.scrollLeft);
        const keyboardNavigation =
          viewport <= 767
            ? await (async () => {
                await rail.focus();
                await rail.evaluate((element) => {
                  element.scrollLeft = 0;
                });
                await page.keyboard.press("ArrowRight");
                await page.evaluate(
                  () =>
                    new Promise((resolve) =>
                      requestAnimationFrame(() => requestAnimationFrame(resolve)),
                    ),
                );
                const rightScroll = await rail.evaluate((element) => element.scrollLeft);
                await page.keyboard.press("ArrowLeft");
                await page.evaluate(
                  () =>
                    new Promise((resolve) =>
                      requestAnimationFrame(() => requestAnimationFrame(resolve)),
                    ),
                );
                const leftScroll = await rail.evaluate((element) => element.scrollLeft);
                return {
                  left: leftScroll < rightScroll,
                  right: rightScroll > 0,
                };
              })()
            : { left: true, right: true };
        await rail.evaluate((element, value) => {
          element.scrollLeft = value;
        }, initialScroll);
        const dynamicBaseline = await measureRailWithoutExclusion(page, section.id);
        const baselineEntry = baseline?.routes?.[route.software]?.[String(viewport)] ?? null;
        const historicalRailWidth =
          baselineEntry?.rails?.[
            section.id === "new-releases" ? "newReleases" : "featuredProducts"
          ]?.scrollWidth ?? null;
        const historicalCardWidth =
          baselineEntry?.cardWidths?.[
            section.id === "new-releases" ? "newReleases" : "featuredProducts"
          ] ?? null;
        const historicalBaselineAvailable =
          historicalRailWidth !== null && historicalCardWidth !== null;
        const baselineRailWidth = historicalBaselineAvailable
          ? historicalRailWidth
          : dynamicBaseline.railScrollWidth;
        const baselineCardWidth = historicalBaselineAvailable
          ? historicalCardWidth
          : dynamicBaseline.cardWidth;
        const baselineSource = historicalBaselineAvailable
          ? "pre-implementation-capture"
          : "test-only-exclusion-disabled";

        for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
          const card = cards.nth(cardIndex);
          const action = card.locator(".redesign-software-card-link");
          await rail.evaluate((element, index) => {
            const cards = Array.from(
              element.querySelectorAll("[data-catalog-card]:not([hidden])"),
            );
            const first = cards[0];
            const target = cards[index];
            if (first instanceof HTMLElement && target instanceof HTMLElement) {
              element.scrollLeft = target.offsetLeft - first.offsetLeft;
            }
          }, cardIndex);
          await action.evaluate((element) =>
            element.scrollIntoView({ block: "end", inline: "nearest", behavior: "instant" }),
          );
          await waitForStableLayout(page);
          const row = await page.evaluate(
              ({ baselineCardWidth, baselineRailWidth, baselineSource, cardIndex, keyboardLeftWorked, keyboardRightWorked, locale, sectionId, viewport }) => {
                const round = (value) => Number(value.toFixed(6));
                const section = document.querySelector(`[data-section="${sectionId}"]`);
                const rail = section?.querySelector(".redesign-software-rail");
                const cards = Array.from(
                  section?.querySelectorAll("[data-catalog-card]:not([hidden])") ?? [],
                ).filter((element) => element instanceof HTMLElement);
                const card = cards[cardIndex];
                const action = card?.querySelector(".redesign-software-card-link");
                const launcher = document.querySelector(
                  'button[aria-controls="customer-support-panel"]',
                );
                const root = document.querySelector(".enhe-redesign-production");
                if (
                  !(rail instanceof HTMLElement) ||
                  !(card instanceof HTMLElement) ||
                  !(action instanceof HTMLElement) ||
                  !(launcher instanceof HTMLElement) ||
                  !(root instanceof HTMLElement)
                ) {
                  throw new Error("Missing rail matrix target");
                }
                const bounds = (element) => {
                  const rect = element.getBoundingClientRect();
                  return {
                    left: round(rect.left),
                    right: round(rect.right),
                    top: round(rect.top),
                    bottom: round(rect.bottom),
                    width: round(rect.width),
                    height: round(rect.height),
                  };
                };
                const supportRect = bounds(launcher);
                const actionRect = bounds(action);
                const cardRect = bounds(card);
                const actionStyle = getComputedStyle(action);
                const railStyle = getComputedStyle(rail);
                const reserve =
                  Number.parseFloat(
                    getComputedStyle(root).getPropertyValue("--support-exclusion-current"),
                  ) || 0;
                const columns =
                  railStyle.display === "grid"
                    ? railStyle.gridTemplateColumns.split(" ").filter(Boolean).length
                    : 1;
                const exclusionExpected =
                  railStyle.display === "flex" || (cardIndex + 1) % columns === 0;
                const marginInlineEnd = Number.parseFloat(actionStyle.marginInlineEnd) || 0;
                const verticalIntersection = Math.max(
                  0,
                  Math.min(supportRect.bottom, actionRect.bottom) -
                    Math.max(supportRect.top, actionRect.top),
                );
                const intersection = Math.max(
                  0,
                  Math.min(supportRect.right, actionRect.right) -
                    Math.max(supportRect.left, actionRect.left),
                );
                const gap = round(supportRect.left - actionRect.right);
                const textClipped =
                  action.scrollWidth > action.clientWidth + 0.5 ||
                  action.scrollHeight > action.clientHeight + 0.5;
                const baselineCardWidthMatch =
                  baselineCardWidth === null
                    ? "not-sampled"
                    : Math.abs(cardRect.width - Number(baselineCardWidth)) <= 0.01;
                const baselineRailWidthMatch =
                  baselineRailWidth === null
                    ? "not-sampled"
                    : Math.abs(rail.scrollWidth - Number(baselineRailWidth)) <= 0.01;
                const exclusionMatch = exclusionExpected
                  ? Math.abs(marginInlineEnd - reserve) <= 0.01
                  : marginInlineEnd <= 0.01;
                const rootOverflow = Math.max(
                  0,
                  document.documentElement.scrollWidth -
                    document.documentElement.clientWidth,
                );
                const beforeIdle = rail.scrollLeft;
                return {
                  locale,
                  viewport,
                  section: sectionId,
                  cardIndex: cardIndex + 1,
                  cardCount: cards.length,
                  layout: railStyle.display,
                  columns,
                  exclusionExpected,
                  exclusionReserve: reserve,
                  marginInlineStart: round(Number.parseFloat(actionStyle.marginInlineStart) || 0),
                  marginInlineEnd: round(marginInlineEnd),
                  exclusionMatch,
                  supportRect,
                  actionRect,
                  cardWidth: cardRect.width,
                  railClientWidth: rail.clientWidth,
                  railScrollWidth: rail.scrollWidth,
                  scrollSnapType: railStyle.scrollSnapType,
                  cardScrollSnapAlign: getComputedStyle(card).scrollSnapAlign,
                  baselineCardWidth,
                  baselineCardWidthMatch,
                  baselineRailWidth,
                  baselineRailWidthMatch,
                  baselineSource,
                  gap,
                  intersection: round(intersection),
                  verticalIntersection: round(verticalIntersection),
                  actionHeight: actionRect.height,
                  textClipped,
                  keyboardLeftWorked,
                  keyboardRightWorked,
                  idleScrollPosition: beforeIdle,
                  rootOverflow,
                  pass:
                    exclusionMatch &&
                    (verticalIntersection === 0 || (intersection === 0 && gap >= 8)) &&
                    actionRect.height >= 44 &&
                    !textClipped &&
                    keyboardLeftWorked &&
                    keyboardRightWorked &&
                    rootOverflow === 0 &&
                    baselineCardWidthMatch === true &&
                    baselineRailWidthMatch === true &&
                    (railStyle.display !== "flex" ||
                      (railStyle.scrollSnapType.includes("x") &&
                        getComputedStyle(card).scrollSnapAlign === "start")),
                };
              },
              {
                baselineCardWidth,
                baselineRailWidth,
                baselineSource,
                cardIndex,
                keyboardLeftWorked: keyboardNavigation.left,
                keyboardRightWorked: keyboardNavigation.right,
                locale: route.locale,
                sectionId: section.id,
                viewport,
              },
          );
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              ),
          );
          row.idleScrollAfter = await rail.evaluate((element) => element.scrollLeft);
          row.noAutoScroll =
            Math.abs(row.idleScrollAfter - row.idleScrollPosition) <= 1;
          row.pass = row.pass && row.noAutoScroll;
          rows.push(row);
        }
      }
    }
  }
  await context.close();
  writeCsv(rows);
  return {
    mode,
    records: rows.length,
    failed: rows.filter((row) => !row.pass).length,
    featuredRailWidthChanged: rows.some(
      (row) => row.section === "featured-products" && row.baselineRailWidthMatch === false,
    ),
    newReleasesRailWidthChanged: rows.some(
      (row) => row.section === "new-releases" && row.baselineRailWidthMatch === false,
    ),
    keyboardLeftFailures: rows.filter((row) => !row.keyboardLeftWorked).length,
    keyboardRightFailures: rows.filter((row) => !row.keyboardRightWorked).length,
    autoScrollFailures: rows.filter((row) => !row.noAutoScroll).length,
  };
}

async function measureStressTargets(page, plans) {
  return page.evaluate(async (plans) => {
    const round = (value) => Number(value.toFixed(6));
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const launcher = document.querySelector(
      'button[aria-controls="customer-support-panel"]',
    );
    if (!(launcher instanceof HTMLElement)) throw new Error("Missing stress launcher");
    const measurements = [];

    for (const plan of plans) {
      let targets = Array.from(document.querySelectorAll(plan.selector)).filter(
        (element) => element instanceof HTMLElement && visible(element),
      );
      if (plan.rightEdge) {
        const grid = document.querySelector(plan.gridSelector);
        if (!(grid instanceof HTMLElement)) throw new Error(`Missing ${plan.gridSelector}`);
        const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
        targets = targets.filter((_, index) => (index + 1) % columns === 0);
        if (!targets.length && columns === 1) {
          targets = Array.from(document.querySelectorAll(plan.selector)).filter(
            (element) => element instanceof HTMLElement && visible(element),
          );
        }
      }
      if (!targets.length) {
        throw new Error(`Missing visible targets for ${plan.type}`);
      }

      for (const target of targets) {
        const card = target.closest("[data-catalog-card]");
        const rail = card?.closest(".redesign-software-rail");
        if (rail instanceof HTMLElement && card instanceof HTMLElement) {
          const first = rail.querySelector("[data-catalog-card]:not([hidden])");
          if (first instanceof HTMLElement) {
            rail.scrollLeft = card.offsetLeft - first.offsetLeft;
          }
        }
        target.scrollIntoView({ block: "end", inline: "nearest", behavior: "instant" });
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        const supportRect = launcher.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const verticalIntersection = Math.max(
          0,
          Math.min(supportRect.bottom, targetRect.bottom) -
            Math.max(supportRect.top, targetRect.top),
        );
        const intersection = Math.max(
          0,
          Math.min(supportRect.right, targetRect.right) -
            Math.max(supportRect.left, targetRect.left),
        );
        measurements.push({
          type: plan.type,
          gap: round(supportRect.left - targetRect.right),
          intersection: round(intersection),
          verticalIntersection: round(verticalIntersection),
          textClipped:
            target.scrollWidth > target.clientWidth + 0.5 ||
            target.scrollHeight > target.clientHeight + 0.5,
        });
      }
    }

    return measurements;
  }, plans);
}

async function exerciseStressInteractions(page, viewport) {
  const launcher = page.locator('button[aria-controls="customer-support-panel"]');
  let menuStacking = true;
  if (viewport <= 767) {
    const launcherRect = await launcher.boundingBox();
    const menuTrigger = page.locator(".redesign-menu-trigger");
    await menuTrigger.click();
    await page.locator(".redesign-mobile-drawer").waitFor({ state: "visible" });
    menuStacking = Boolean(
      launcherRect &&
        (await page.evaluate(({ x, y }) => {
          const hit = document.elementFromPoint(x, y);
          return Boolean(
            hit?.closest(".redesign-mobile-drawer, .redesign-menu-overlay") &&
              !hit?.closest('button[aria-controls="customer-support-panel"]'),
          );
        }, {
          x: launcherRect.x + launcherRect.width / 2,
          y: launcherRect.y + launcherRect.height / 2,
        })),
    );
    await page.locator(".redesign-drawer-close").click();
    await page.locator(".redesign-mobile-drawer").waitFor({ state: "hidden" });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  }

  await launcher.focus();
  const focusedBeforeOpen = await launcher.evaluate(
    (element) => document.activeElement === element,
  );
  await launcher.press("Enter");
  const panel = page.locator("#customer-support-panel");
  const panelOpen = await panel
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  const expanded = (await launcher.getAttribute("aria-expanded")) === "true";
  const launcherRemovedFromTabOrder =
    (await launcher.getAttribute("tabindex")) === "-1";
  const focusInsidePanel = panelOpen
    ? await panel.evaluate((element) => element.contains(document.activeElement))
    : false;
  let openPanelMenuStacking = true;
  if (viewport <= 767 && panelOpen) {
    const panelRect = await panel.boundingBox();
    const menuTrigger = page.locator(".redesign-menu-trigger");
    await menuTrigger.click();
    await page.locator(".redesign-mobile-drawer").waitFor({ state: "visible" });
    openPanelMenuStacking = Boolean(
      panelRect &&
        (await page.evaluate(({ x, y }) => {
          const hit = document.elementFromPoint(x, y);
          return Boolean(
            hit?.closest(".redesign-mobile-drawer, .redesign-menu-overlay") &&
              !hit?.closest(".customer-support-widget"),
          );
        }, {
          x: panelRect.x + panelRect.width / 2,
          y: panelRect.y + panelRect.height / 2,
        })),
    );
    await page.locator(".redesign-drawer-close").click();
    await page.locator(".redesign-mobile-drawer").waitFor({ state: "hidden" });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await panel.locator("button").first().focus();
  }
  await page.keyboard.press("Escape");
  const panelClosed = await panel
    .waitFor({ state: "hidden", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  const collapsed = (await launcher.getAttribute("aria-expanded")) === "false";
  const focusReturned = await launcher.evaluate((element) => document.activeElement === element);
  return {
    menuStacking,
    focusedBeforeOpen,
    panelOpen,
    focusInsidePanel,
    expanded,
    launcherRemovedFromTabOrder,
    openPanelMenuStacking,
    panelClosed,
    collapsed,
    focusReturned,
  };
}

async function collectStress(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const rows = [];
  const stressWidths = [320, 390, 480, 483, 484, 767, 768, 1024, 1440];
  const softwarePlans = [
    {
      type: "new-releases",
      selector: '[data-section="new-releases"] .redesign-software-card-link',
    },
    {
      type: "featured",
      selector: '[data-section="featured-products"] .redesign-software-card-link',
    },
    {
      type: "all-products",
      selector: '[data-section="all-products"] .redesign-software-card-link',
      rightEdge: true,
      gridSelector: '[data-section="all-products"] .redesign-software-grid-all',
    },
    { type: "load-more", selector: ".redesign-software-load-row a" },
    { type: "footer", selector: ".redesign-footer a" },
  ];
  const paginationPlans = [
    { type: "previous", selector: '.redesign-software-load-row a[rel="prev"]' },
    { type: "next", selector: '.redesign-software-load-row a[rel="next"]' },
  ];
  const homePlans = [
    {
      type: "home-cta",
      selector: ".redesign-home-cta",
      requireRelevant: false,
    },
    { type: "home-brand-cta", selector: ".redesign-home-brand-value-cta" },
    { type: "home-product-control", selector: ".redesign-home-product-control" },
    { type: "home-review-control", selector: ".redesign-home-reviews-control" },
    { type: "home-footer", selector: ".redesign-footer a" },
  ];
  const stressPlans = [...softwarePlans, ...paginationPlans, ...homePlans];

  for (let run = 1; run <= runs; run += 1) {
    for (const route of localeRoutes) {
      const byWidth = new Map();
      await page.setViewportSize({ width: 320, height: 844 });
      await openRoute(page, route.software);
      for (const viewport of stressWidths) {
        await page.setViewportSize({ width: viewport, height: viewport <= 480 ? 844 : 900 });
        await waitForStableLayout(page);
        const measurements = await measureStressTargets(page, softwarePlans);
        const interactions = await exerciseStressInteractions(page, viewport);
        const layout = await page.evaluate(() => {
          const pick = (selector) => document.querySelector(selector);
          const root = pick(".enhe-redesign-production");
          const launcher = pick('button[aria-controls="customer-support-panel"]');
          const label = launcher?.querySelector(".customer-support-launcher-label");
          const allGrid = pick('[data-section="all-products"] .redesign-software-grid-all');
          const newRail = pick('[data-section="new-releases"] .redesign-software-rail');
          const featuredRail = pick(
            '[data-section="featured-products"] .redesign-software-rail',
          );
          const firstCardWidth = (section) =>
            pick(`[data-section="${section}"] [data-catalog-card]`)?.getBoundingClientRect()
              .width ?? 0;
          if (!(root instanceof HTMLElement) || !(launcher instanceof HTMLElement)) {
            throw new Error("Missing stress layout root");
          }
          const launcherRect = launcher.getBoundingClientRect();
          return {
            supportMode:
              label instanceof HTMLElement &&
              getComputedStyle(label).display !== "none" &&
              label.getBoundingClientRect().width > 0
                ? "text"
                : "icon",
            supportWidth: launcherRect.width,
            supportHeight: launcherRect.height,
            reserve:
              Number.parseFloat(
                getComputedStyle(root).getPropertyValue("--support-exclusion-current"),
              ) || 0,
            newCardWidth: firstCardWidth("new-releases"),
            featuredCardWidth: firstCardWidth("featured-products"),
            allCardWidth: firstCardWidth("all-products"),
            newRailWidth: newRail instanceof HTMLElement ? newRail.scrollWidth : 0,
            featuredRailWidth:
              featuredRail instanceof HTMLElement ? featuredRail.scrollWidth : 0,
            gridWidth: allGrid instanceof HTMLElement ? allGrid.getBoundingClientRect().width : 0,
            rootOverflow: Math.max(
              0,
              document.documentElement.scrollWidth - document.documentElement.clientWidth,
            ),
          };
        });
        byWidth.set(viewport, { measurements, interactions, layout });
      }

      await openRoute(page, route.softwarePageTwo);
      for (const viewport of stressWidths) {
        await page.setViewportSize({ width: viewport, height: viewport <= 480 ? 844 : 900 });
        await waitForStableLayout(page);
        byWidth.get(viewport).measurements.push(
          ...(await measureStressTargets(page, paginationPlans)),
        );
      }

      await openRoute(page, route.home);
      for (const viewport of stressWidths) {
        await page.setViewportSize({ width: viewport, height: viewport <= 480 ? 844 : 900 });
        await waitForStableLayout(page);
        const state = byWidth.get(viewport);
        state.measurements.push(...(await measureStressTargets(page, homePlans)));
        const targetCoverage = summarizeTargetCoverage(state.measurements, stressPlans);
        const relevant = state.measurements.filter(
          (measurement) => measurement.verticalIntersection > 0,
        );
        const intersections = relevant.filter(
          (measurement) => measurement.intersection > 0 || measurement.gap < 8,
        ).length;
        const textClipping = state.measurements.filter(
          (measurement) => measurement.textClipped,
        ).length;
        const minimumGap = relevant.length
          ? Math.min(...relevant.map((measurement) => measurement.gap))
          : null;
        const expectedMode = viewport <= iconSupportModeMaxWidth ? "icon" : "text";
        const expectedReserve = viewport <= iconSupportModeMaxWidth ? 52 : 104;
        const supportSizePass =
          expectedMode === "icon"
            ? Math.abs(state.layout.supportWidth - 44) <= 1 &&
              Math.abs(state.layout.supportHeight - 44) <= 1
            : state.layout.supportWidth >= 88 &&
              state.layout.supportWidth <= 96 &&
              Math.abs(state.layout.supportHeight - 46) <= 0.1;
        rows.push({
          run,
          locale: route.locale,
          viewport,
          supportMode: state.layout.supportMode,
          supportWidth: state.layout.supportWidth,
          supportHeight: state.layout.supportHeight,
          exclusionReserve: state.layout.reserve,
          criticalChecks: state.measurements.length,
          inspectedTargetTypes: targetCoverage.inspectedTargetTypes,
          expectedTargetTypes: targetCoverage.expectedTargetTypes,
          measuredTargetTypes: targetCoverage.measuredTargetTypes,
          targetSampleCounts: targetCoverage.targetSampleCounts,
          relevantTargetSampleCounts: targetCoverage.relevantTargetSampleCounts,
          missingTargetTypes: targetCoverage.missingTargetTypes,
          missingRelevantTargetTypes: targetCoverage.missingRelevantTargetTypes,
          validGeometrySamples: targetCoverage.validGeometrySamples,
          invalidGeometrySamples: targetCoverage.invalidGeometrySamples,
          relevantGeometrySamples: targetCoverage.relevantGeometrySamples,
          intersections,
          minimumGap,
          textClipping,
          rootOverflow: state.layout.rootOverflow,
          newCardWidth: state.layout.newCardWidth,
          featuredCardWidth: state.layout.featuredCardWidth,
          allCardWidth: state.layout.allCardWidth,
          newRailWidth: state.layout.newRailWidth,
          featuredRailWidth: state.layout.featuredRailWidth,
          gridWidth: state.layout.gridWidth,
          menuStacking: state.interactions.menuStacking,
          openPanelMenuStacking: state.interactions.openPanelMenuStacking,
          focusedBeforeOpen: state.interactions.focusedBeforeOpen,
          panelOpen: state.interactions.panelOpen,
          focusInsidePanel: state.interactions.focusInsidePanel,
          launcherRemovedFromTabOrder:
            state.interactions.launcherRemovedFromTabOrder,
          ariaExpanded: state.interactions.expanded,
          escapeClose: state.interactions.panelClosed,
          ariaCollapsed: state.interactions.collapsed,
          focusReturn: state.interactions.focusReturned,
          pass:
            state.layout.supportMode === expectedMode &&
            state.layout.reserve === expectedReserve &&
            supportSizePass &&
            targetCoverage.pass &&
            intersections === 0 &&
            Number.isFinite(minimumGap) &&
            minimumGap >= 8 &&
            textClipping === 0 &&
            state.layout.rootOverflow === 0 &&
            Object.values(state.interactions).every(Boolean),
        });
      }
    }
  }

  const firstRun = new Map(
    rows
      .filter((row) => row.run === 1)
      .map((row) => [`${row.locale}:${row.viewport}`, row]),
  );
  for (const row of rows) {
    const first = firstRun.get(`${row.locale}:${row.viewport}`);
    row.repeatStable = Boolean(
      first &&
        row.supportMode === first.supportMode &&
        row.exclusionReserve === first.exclusionReserve &&
        Math.abs(row.supportWidth - first.supportWidth) <= 0.01 &&
        Math.abs(row.newCardWidth - first.newCardWidth) <= 0.01 &&
        Math.abs(row.featuredCardWidth - first.featuredCardWidth) <= 0.01 &&
        Math.abs(row.allCardWidth - first.allCardWidth) <= 0.01 &&
        Math.abs(row.newRailWidth - first.newRailWidth) <= 0.01 &&
        Math.abs(row.featuredRailWidth - first.featuredRailWidth) <= 0.01 &&
        Math.abs(row.gridWidth - first.gridWidth) <= 0.01,
    );
    row.pass = row.pass && row.repeatStable;
  }

  await context.close();
  writeCsv(rows);
  const runPasses = Array.from({ length: runs }, (_, index) => index + 1).filter(
    (run) => rows.filter((row) => row.run === run).every((row) => row.pass),
  ).length;
  return {
    mode,
    records: rows.length,
    runs,
    passedRuns: runPasses,
    failed: rows.filter((row) => !row.pass).length,
    missingTargetTypes: rows.filter((row) => row.missingTargetTypes).length,
    missingRelevantTargetTypes: rows.filter(
      (row) => row.missingRelevantTargetTypes,
    ).length,
    invalidGeometrySamples: rows.reduce(
      (sum, row) => sum + row.invalidGeometrySamples,
      0,
    ),
  };
}

async function readSupportReflowState(page) {
  return page.evaluate(() => {
    const launcher = document.querySelector(
      'button[aria-controls="customer-support-panel"]',
    );
    const root = document.querySelector(".enhe-redesign-production");
    if (!(launcher instanceof HTMLElement) || !(root instanceof HTMLElement)) {
      throw new Error("Missing browser reflow root");
    }
    const label = launcher.querySelector(".customer-support-launcher-label");
    return {
      layoutWidth: innerWidth,
      layoutHeight: innerHeight,
      labelVisible: Boolean(
        label instanceof HTMLElement &&
          getComputedStyle(label).display !== "none" &&
          label.getBoundingClientRect().width > 0,
      ),
      reserve:
        Number.parseFloat(
          getComputedStyle(root).getPropertyValue("--support-exclusion-current"),
        ) || 0,
      rootOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    };
  });
}

async function collectBrowserMatrix(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const rows = [];
  const routes = [
    { locale: "zh", path: "/", kind: "home", label: "客服" },
    { locale: "en", path: "/en", kind: "home", label: "Chat" },
    { locale: "zh", path: "/software", kind: "software", label: "客服" },
    { locale: "en", path: "/en/software", kind: "software", label: "Chat" },
    { locale: "zh", path: "/software?page=2", kind: "pagination", label: "客服" },
    { locale: "en", path: "/en/software?page=2", kind: "pagination", label: "Chat" },
  ];
  const plans = {
    software: [
      {
        type: "new-releases",
        selector: '[data-section="new-releases"] .redesign-software-card-link',
      },
      {
        type: "featured",
        selector: '[data-section="featured-products"] .redesign-software-card-link',
      },
      {
        type: "all-products",
        selector: '[data-section="all-products"] .redesign-software-card-link',
        rightEdge: true,
        gridSelector: '[data-section="all-products"] .redesign-software-grid-all',
      },
      { type: "load-more", selector: ".redesign-software-load-row a" },
      { type: "footer", selector: ".redesign-footer a" },
    ],
    pagination: [
      { type: "previous", selector: '.redesign-software-load-row a[rel="prev"]' },
      { type: "next", selector: '.redesign-software-load-row a[rel="next"]' },
      { type: "footer", selector: ".redesign-footer a" },
    ],
    home: [
      {
        type: "home-cta",
        selector: ".redesign-home-cta",
        requireRelevant: false,
      },
      { type: "home-brand-cta", selector: ".redesign-home-brand-value-cta" },
      { type: "home-product-control", selector: ".redesign-home-product-control" },
      { type: "home-review-control", selector: ".redesign-home-reviews-control" },
      { type: "footer", selector: ".redesign-footer a" },
    ],
  };
  const browserMatrixWidths = widths.length ? widths : matrixWidths;

  for (const route of routes) {
    for (const viewport of browserMatrixWidths) {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const viewportHeight = viewport <= 480 ? 844 : 900;
      await page.setViewportSize({ width: viewport, height: viewportHeight });
      const response = await page.goto(new URL(route.path, baseUrl).href, {
        waitUntil: "networkidle",
      });
      await waitForStableLayout(page);
      const measurements = await measureStressTargets(page, plans[route.kind]);
      const targetCoverage = summarizeTargetCoverage(measurements, plans[route.kind]);
      const interactions = await exerciseStressInteractions(page, viewport);
      const visual = await page.evaluate(({ label }) => {
        const launcher = document.querySelector(
          'button[aria-controls="customer-support-panel"]',
        );
        const root = document.querySelector(".enhe-redesign-production");
        if (!(launcher instanceof HTMLElement) || !(root instanceof HTMLElement)) {
          throw new Error("Missing browser matrix root");
        }
        const labelElement = launcher.querySelector(".customer-support-launcher-label");
        const rect = launcher.getBoundingClientRect();
        const text = document.body.innerText;
        return {
          supportWidth: rect.width,
          supportHeight: rect.height,
          rightOffset: innerWidth - rect.right,
          bottomOffset: innerHeight - rect.bottom,
          labelVisible: Boolean(
            labelElement instanceof HTMLElement &&
              getComputedStyle(labelElement).display !== "none" &&
              labelElement.getBoundingClientRect().width > 0,
          ),
          iconVisible: Boolean(launcher.querySelector("svg")?.getBoundingClientRect().width),
          ariaLabel: launcher.getAttribute("aria-label"),
          reserve:
            Number.parseFloat(
              getComputedStyle(root).getPropertyValue("--support-exclusion-current"),
            ) || 0,
          rootOverflow: Math.max(
            0,
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
          candidatePreviewText: /\b(?:Candidate|Preview)\b/.test(text),
          expectedLabelPresent: text.includes(label),
        };
      }, { label: route.label });
      const zoom200PreLayoutWidth = viewport * 2;
      const zoom200PreLayoutHeight = viewportHeight * 2;
      await page.setViewportSize({
        width: zoom200PreLayoutWidth,
        height: zoom200PreLayoutHeight,
      });
      await waitForStableLayout(page);
      const zoomPreVisual = await readSupportReflowState(page);
      const zoom200LayoutWidth = viewport;
      const zoom200LayoutHeight = viewportHeight;
      await page.setViewportSize({
        width: zoom200LayoutWidth,
        height: zoom200LayoutHeight,
      });
      await waitForStableLayout(page);
      const zoomVisible = await page
        .locator('button[aria-controls="customer-support-panel"]')
        .isVisible();
      const zoomMeasurements = await measureStressTargets(page, plans[route.kind]);
      const zoomTargetCoverage = summarizeTargetCoverage(
        zoomMeasurements,
        plans[route.kind],
      );
      const zoomVisual = await readSupportReflowState(page);
      const zoomRelevant = zoomMeasurements.filter(
        (measurement) => measurement.verticalIntersection > 0,
      );
      const zoomIntersections = zoomRelevant.filter(
        (measurement) => measurement.intersection > 0 || measurement.gap < 8,
      );
      const zoomMinimumGap = zoomRelevant.length
        ? Math.min(...zoomRelevant.map((measurement) => measurement.gap))
        : null;
      const zoomTextClipping = zoomMeasurements.filter(
        (measurement) => measurement.textClipped,
      ).length;
      await page.setViewportSize({ width: viewport, height: viewportHeight });
      await waitForStableLayout(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const reducedMotion = await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const relevant = measurements.filter(
        (measurement) => measurement.verticalIntersection > 0,
      );
      const intersections = relevant.filter(
        (measurement) => measurement.intersection > 0 || measurement.gap < 8,
      ).length;
      const minimumGap = relevant.length
        ? Math.min(...relevant.map((measurement) => measurement.gap))
        : null;
      const textClipping = measurements.filter(
        (measurement) => measurement.textClipped,
      ).length;
      const expectedIconMode = viewport <= iconSupportModeMaxWidth;
      rows.push({
        locale: route.locale,
        path: route.path,
        routeKind: route.kind,
        viewport,
        httpStatus: response?.status() ?? 0,
        supportMode: visual.labelVisible ? "text" : "icon",
        supportWidth: visual.supportWidth,
        supportHeight: visual.supportHeight,
        rightOffset: visual.rightOffset,
        bottomOffset: visual.bottomOffset,
        visibleLabel: visual.labelVisible,
        iconVisible: visual.iconVisible,
        ariaLabel: visual.ariaLabel,
        exclusionReserve: visual.reserve,
        criticalChecks: measurements.length,
        inspectedTargetTypes: targetCoverage.inspectedTargetTypes,
        expectedTargetTypes: targetCoverage.expectedTargetTypes,
        measuredTargetTypes: targetCoverage.measuredTargetTypes,
        targetSampleCounts: targetCoverage.targetSampleCounts,
        relevantTargetSampleCounts: targetCoverage.relevantTargetSampleCounts,
        missingTargetTypes: targetCoverage.missingTargetTypes,
        missingRelevantTargetTypes: targetCoverage.missingRelevantTargetTypes,
        validGeometrySamples: targetCoverage.validGeometrySamples,
        invalidGeometrySamples: targetCoverage.invalidGeometrySamples,
        relevantGeometrySamples: targetCoverage.relevantGeometrySamples,
        intersections,
        minimumGap,
        textClipping,
        rootOverflow: visual.rootOverflow,
        menuStacking: interactions.menuStacking,
        openPanelMenuStacking: interactions.openPanelMenuStacking,
        panelOpen: interactions.panelOpen,
        focusInsidePanel: interactions.focusInsidePanel,
        launcherRemovedFromTabOrder: interactions.launcherRemovedFromTabOrder,
        escapeClose: interactions.panelClosed,
        focusReturn: interactions.focusReturned,
        zoom200SupportVisible: zoomVisible,
        zoom200PreLayoutWidth: zoomPreVisual.layoutWidth,
        zoom200PreLayoutHeight: zoomPreVisual.layoutHeight,
        zoom200PreLabelVisible: zoomPreVisual.labelVisible,
        zoom200PreExclusionReserve: zoomPreVisual.reserve,
        zoom200LayoutWidth: zoomVisual.layoutWidth,
        zoom200LayoutHeight: zoomVisual.layoutHeight,
        zoom200LabelVisible: zoomVisual.labelVisible,
        zoom200ExclusionReserve: zoomVisual.reserve,
        zoom200InspectedTargetTypes: zoomTargetCoverage.inspectedTargetTypes,
        zoom200ExpectedTargetTypes: zoomTargetCoverage.expectedTargetTypes,
        zoom200MeasuredTargetTypes: zoomTargetCoverage.measuredTargetTypes,
        zoom200TargetSampleCounts: zoomTargetCoverage.targetSampleCounts,
        zoom200RelevantTargetSampleCounts:
          zoomTargetCoverage.relevantTargetSampleCounts,
        zoom200MissingTargetTypes: zoomTargetCoverage.missingTargetTypes,
        zoom200MissingRelevantTargetTypes:
          zoomTargetCoverage.missingRelevantTargetTypes,
        zoom200ValidGeometrySamples: zoomTargetCoverage.validGeometrySamples,
        zoom200InvalidGeometrySamples: zoomTargetCoverage.invalidGeometrySamples,
        zoom200RelevantGeometrySamples: zoomTargetCoverage.relevantGeometrySamples,
        zoom200Intersections: zoomIntersections.length,
        zoom200CollisionTargets: [
          ...new Set(zoomIntersections.map((measurement) => measurement.type)),
        ].join("|"),
        zoom200MinimumGap: zoomMinimumGap,
        zoom200TextClipping: zoomTextClipping,
        zoom200RootOverflow: zoomVisual.rootOverflow,
        reducedMotion,
        consoleErrors: consoleErrors.length,
        pageErrors: pageErrors.length,
        candidatePreviewText: visual.candidatePreviewText,
        pass:
          response?.status() === 200 &&
          (expectedIconMode
            ? !visual.labelVisible &&
              Math.abs(visual.supportWidth - 44) <= 1 &&
              Math.abs(visual.supportHeight - 44) <= 1 &&
              visual.reserve === 52
            : visual.labelVisible &&
              visual.supportWidth >= 88 &&
              visual.supportWidth <= 96 &&
              Math.abs(visual.supportHeight - 46) <= 0.1 &&
              visual.reserve === 104) &&
          visual.iconVisible &&
          visual.ariaLabel === route.label &&
          visual.rightOffset >= 16 &&
          visual.bottomOffset >= 16 &&
          targetCoverage.pass &&
          intersections === 0 &&
          Number.isFinite(minimumGap) &&
          minimumGap >= 8 &&
          textClipping === 0 &&
          visual.rootOverflow === 0 &&
          Object.values(interactions).every(Boolean) &&
          zoomVisible &&
          zoomPreVisual.layoutWidth === zoom200PreLayoutWidth &&
          zoomPreVisual.layoutHeight === zoom200PreLayoutHeight &&
          zoomPreVisual.labelVisible ===
            (zoom200PreLayoutWidth >= textSupportModeMinWidth) &&
          zoomPreVisual.reserve ===
            (zoom200PreLayoutWidth <= iconSupportModeMaxWidth ? 52 : 104) &&
          zoomVisual.layoutWidth === zoom200LayoutWidth &&
          zoomVisual.layoutHeight === zoom200LayoutHeight &&
          zoomVisual.layoutWidth * 2 === zoomPreVisual.layoutWidth &&
          zoomVisual.labelVisible ===
            (zoom200LayoutWidth >= textSupportModeMinWidth) &&
          zoomVisual.reserve ===
            (zoom200LayoutWidth <= iconSupportModeMaxWidth ? 52 : 104) &&
          zoomTargetCoverage.pass &&
          zoomIntersections.length === 0 &&
          Number.isFinite(zoomMinimumGap) &&
          zoomMinimumGap >= 8 &&
          zoomTextClipping === 0 &&
          zoomVisual.rootOverflow === 0 &&
          reducedMotion &&
          consoleErrors.length === 0 &&
          pageErrors.length === 0 &&
          !visual.candidatePreviewText,
      });
    }
  }
  await context.close();
  writeCsv(rows);
  return {
    mode,
    records: rows.length,
    failed: rows.filter((row) => !row.pass).length,
    consoleErrors: rows.reduce((sum, row) => sum + row.consoleErrors, 0),
    pageErrors: rows.reduce((sum, row) => sum + row.pageErrors, 0),
    missingTargetTypes: rows.filter((row) => row.missingTargetTypes).length,
    missingRelevantTargetTypes: rows.filter(
      (row) => row.missingRelevantTargetTypes,
    ).length,
    invalidGeometrySamples: rows.reduce(
      (sum, row) => sum + row.invalidGeometrySamples,
      0,
    ),
    intersections: rows.reduce((sum, row) => sum + row.intersections, 0),
    minimumGap: Math.min(...rows.map((row) => row.minimumGap)),
  };
}

async function collectFractionalBoundaryMatrix(browser) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const boundaryWidths = [767.5, 768.5, 1024.5];
  const cases = localeRoutes.flatMap((route) =>
    boundaryWidths.flatMap((requestedWidth) => [
      {
        locale: route.locale,
        path: route.software,
        kind: "software",
        requestedWidth,
      },
      {
        locale: route.locale,
        path: route.home,
        kind: "home",
        requestedWidth,
      },
    ]),
  );
  const plans = {
    software: [
      {
        type: "new-releases",
        selector: '[data-section="new-releases"] .redesign-software-card-link',
      },
      {
        type: "featured",
        selector: '[data-section="featured-products"] .redesign-software-card-link',
      },
      {
        type: "all-products",
        selector: '[data-section="all-products"] .redesign-software-card-link',
        rightEdge: true,
        gridSelector: '[data-section="all-products"] .redesign-software-grid-all',
      },
      { type: "load-more", selector: ".redesign-software-load-row a" },
      { type: "footer", selector: ".redesign-footer a" },
    ],
    home: [
      {
        type: "home-cta",
        selector: ".redesign-home-cta",
        requireRelevant: false,
      },
      { type: "home-brand-cta", selector: ".redesign-home-brand-value-cta" },
      { type: "home-product-control", selector: ".redesign-home-product-control" },
      { type: "home-review-control", selector: ".redesign-home-reviews-control" },
      { type: "footer", selector: ".redesign-footer a" },
    ],
  };
  const rows = [];
  await page.goto(new URL("/", baseUrl).href, { waitUntil: "networkidle" });

  for (const testCase of cases) {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    const source = new URL(testCase.path, baseUrl).href;
    await page.evaluate(
      ({ source, requestedWidth }) => {
        const frame = document.createElement("iframe");
        frame.dataset.fractionalBoundary = "true";
        frame.src = source;
        frame.style.cssText = `display:block;width:${requestedWidth}px;height:900px;border:0`;
        document.body.replaceChildren(frame);
      },
      { source, requestedWidth: testCase.requestedWidth },
    );
    const frameElement = await page.locator("iframe[data-fractional-boundary]").elementHandle();
    const frame = await frameElement?.contentFrame();
    if (!frameElement || !frame) throw new Error("Missing fractional boundary frame");
    await frame.waitForURL(source, { waitUntil: "domcontentloaded" });
    await frame.waitForSelector('button[aria-controls="customer-support-panel"]');
    await waitForStableLayout(frame);
    const frameBox = await frameElement.boundingBox();
    const measurements = await measureStressTargets(frame, plans[testCase.kind]);
    const targetCoverage = summarizeTargetCoverage(measurements, plans[testCase.kind]);
    const relevant = measurements.filter(
      (measurement) => measurement.verticalIntersection > 0,
    );
    const intersections = relevant.filter(
      (measurement) => measurement.intersection > 0 || measurement.gap < 8,
    ).length;
    const minimumGap = relevant.length
      ? Math.min(...relevant.map((measurement) => measurement.gap))
      : null;
    const visual = await frame.evaluate(() => {
      const root = document.querySelector(".enhe-redesign-production");
      const launcher = document.querySelector(
        'button[aria-controls="customer-support-panel"]',
      );
      if (!(root instanceof HTMLElement) || !(launcher instanceof HTMLElement)) {
        throw new Error("Missing fractional boundary root");
      }
      const label = launcher.querySelector(".customer-support-launcher-label");
      return {
        innerWidth,
        documentWidth: document.documentElement.getBoundingClientRect().width,
        below768: matchMedia("(width < 768px)").matches,
        atLeast768: matchMedia("(width >= 768px)").matches,
        threeColumnRange: matchMedia("(768px < width <= 1024px)").matches,
        above1024: matchMedia("(width > 1024px)").matches,
        labelVisible: Boolean(
          label instanceof HTMLElement &&
            getComputedStyle(label).display !== "none" &&
            label.getBoundingClientRect().width > 0,
        ),
        reserve:
          Number.parseFloat(
            getComputedStyle(root).getPropertyValue("--support-exclusion-current"),
          ) || 0,
        rootOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      };
    });
    const effectiveWidth = visual.documentWidth;
    const expectedBelow768 = effectiveWidth < 768;
    const expectedThreeColumnRange =
      effectiveWidth > 768 && effectiveWidth <= 1024;
    const expectedAbove1024 = effectiveWidth > 1024;
    const expectedTextMode = effectiveWidth >= textSupportModeMinWidth;
    rows.push({
      locale: testCase.locale,
      path: testCase.path,
      routeKind: testCase.kind,
      requestedWidth: testCase.requestedWidth,
      frameWidth: frameBox?.width ?? 0,
      innerWidth: visual.innerWidth,
      documentWidth: visual.documentWidth,
      layoutQuantization: visual.documentWidth - testCase.requestedWidth,
      below768: visual.below768,
      atLeast768: visual.atLeast768,
      threeColumnRange: visual.threeColumnRange,
      above1024: visual.above1024,
      supportMode: visual.labelVisible ? "text" : "icon",
      exclusionReserve: visual.reserve,
      inspectedTargetTypes: targetCoverage.inspectedTargetTypes,
      expectedTargetTypes: targetCoverage.expectedTargetTypes,
      measuredTargetTypes: targetCoverage.measuredTargetTypes,
      targetSampleCounts: targetCoverage.targetSampleCounts,
      relevantTargetSampleCounts: targetCoverage.relevantTargetSampleCounts,
      missingTargetTypes: targetCoverage.missingTargetTypes,
      missingRelevantTargetTypes: targetCoverage.missingRelevantTargetTypes,
      validGeometrySamples: targetCoverage.validGeometrySamples,
      invalidGeometrySamples: targetCoverage.invalidGeometrySamples,
      relevantGeometrySamples: relevant.length,
      intersections,
      minimumGap,
      rootOverflow: visual.rootOverflow,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      pass:
        Math.abs((frameBox?.width ?? 0) - testCase.requestedWidth) <= 0.01 &&
        visual.below768 === expectedBelow768 &&
        visual.atLeast768 === !expectedBelow768 &&
        visual.threeColumnRange === expectedThreeColumnRange &&
        visual.above1024 === expectedAbove1024 &&
        visual.labelVisible === expectedTextMode &&
        visual.reserve === (expectedTextMode ? 104 : 52) &&
        targetCoverage.pass &&
        relevant.length > 0 &&
        intersections === 0 &&
        Number.isFinite(minimumGap) &&
        minimumGap >= 8 &&
        visual.rootOverflow === 0 &&
        consoleErrors.length === 0 &&
        pageErrors.length === 0,
    });
  }

  await context.close();
  writeCsv(rows);
  return {
    mode,
    records: rows.length,
    failed: rows.filter((row) => !row.pass).length,
    missingTargetTypes: rows.filter((row) => row.missingTargetTypes).length,
    missingRelevantTargetTypes: rows.filter(
      (row) => row.missingRelevantTargetTypes,
    ).length,
    invalidGeometrySamples: rows.reduce(
      (sum, row) => sum + row.invalidGeometrySamples,
      0,
    ),
    intersections: rows.reduce((sum, row) => sum + row.intersections, 0),
    minimumGap: Math.min(...rows.map((row) => row.minimumGap)),
  };
}

async function collectScreenshots(browser) {
  mkdirSync(output, { recursive: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  const shots = [
    ["zh-software-support-exclusion-320.png", "/software", 320, 844],
    ["en-software-support-exclusion-320.png", "/en/software", 320, 844],
    ["zh-software-support-exclusion-390.png", "/software", 390, 844],
    ["en-software-support-exclusion-390.png", "/en/software", 390, 844],
    ["zh-software-support-icon-max.png", "/software", 483, 900],
    ["en-software-support-icon-max.png", "/en/software", 483, 900],
    ["zh-software-support-text-min.png", "/software", 484, 900],
    ["en-software-support-text-min.png", "/en/software", 484, 900],
    ["zh-home-support-exclusion-390.png", "/", 390, 844],
    ["en-home-support-exclusion-390.png", "/en", 390, 844],
    ["zh-software-support-tablet-768.png", "/software", 768, 900],
    ["en-software-support-tablet-768.png", "/en/software", 768, 900],
    ["zh-software-support-desktop-1440.png", "/software", 1440, 900],
    ["en-software-support-desktop-1440.png", "/en/software", 1440, 900],
  ];
  const rows = [];
  for (const [fileName, path, width, height] of shots) {
    await page.setViewportSize({ width, height });
    await openRoute(page, path);
    const removedPortals = await page.locator("nextjs-portal").count();
    await page.locator("nextjs-portal").evaluateAll((elements) => {
      for (const element of elements) element.remove();
    });
    const appText = await page.locator("body").innerText();
    const launcher = page.locator('button[aria-controls="customer-support-panel"]');
    const labelVisible = await launcher
      .locator(".customer-support-launcher-label")
      .isVisible();
    const rootOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    await page.screenshot({ path: join(output, fileName), fullPage: true });
    rows.push({
      fileName,
      path,
      width,
      height,
      removedPortals,
      launcherVisible: await launcher.isVisible(),
      labelVisible,
      expectedLabelVisible: width >= textSupportModeMinWidth,
      rootOverflow,
      candidatePreviewText: /\b(?:Candidate|Preview)\b/.test(appText),
      pass:
        (await launcher.isVisible()) &&
        labelVisible === (width >= textSupportModeMinWidth) &&
        rootOverflow <= 0 &&
        !/\b(?:Candidate|Preview)\b/.test(appText),
    });
  }
  await context.close();
  writeFileSync(join(output, "screenshot-manifest.csv"), "", "utf8");
  const manifestOutput = output;
  const headers = Object.keys(rows[0]);
  writeFileSync(
    join(manifestOutput, "screenshot-manifest.csv"),
    `${[
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
    ].join("\n")}\n`,
    "utf8",
  );
  return {
    mode,
    screenshots: rows.length,
    failed: rows.filter((row) => !row.pass).length,
    removedPortals: rows.reduce((sum, row) => sum + row.removedPortals, 0),
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const result =
    mode === "support-widths"
      ? await collectSupportWidths(browser)
      : mode === "natural-targets"
        ? await collectTargetScan(browser, false)
        : mode === "simulate-text-scan"
          ? await collectTargetScan(browser, true)
          : mode === "production-scan"
            ? await collectTargetScan(browser, false)
            : mode === "all-products-matrix"
              ? await collectAllProductsMatrix(browser)
              : mode === "rail-matrix"
                ? await collectRailMatrix(browser)
                : mode === "stress"
                   ? await collectStress(browser)
                   : mode === "browser-matrix"
                     ? await collectBrowserMatrix(browser)
                     : mode === "fractional-boundary-matrix"
                       ? await collectFractionalBoundaryMatrix(browser)
                       : mode === "screenshots"
                         ? await collectScreenshots(browser)
           : null;
  if (!result) throw new Error(`Unsupported mode: ${mode}`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await browser.close();
}
