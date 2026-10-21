import { expect, test } from "@playwright/test";
import axe from "axe-core";

if (process.env.DATABASE_URL?.trim()) {
  throw new Error("AI News card contrast checks require an empty DATABASE_URL.");
}

for (const route of ["/ai-news", "/en/ai-news"] as const) {
  for (const width of [390, 1440] as const) {
    test(`${route} synthetic card fixture remains readable at ${width}px`, async ({ page, baseURL }) => {
      expect(baseURL && new URL(baseURL).hostname).toMatch(/^(localhost|127\.0\.0\.1|\[::1\])$/);
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route, { waitUntil: "load" });
      expect(response?.status()).toBe(200);

      await page.addScriptTag({ content: axe.source });
      await page.locator("main.ai-news-page").evaluate((main) => {
        const card = document.createElement("article");
        card.className = "ai-news-interactive-card glass rounded-2xl p-5";

        const title = document.createElement("h2");
        title.className = "text-[var(--marketing-text)]";
        title.textContent = "Sample AI news card title";

        const summary = document.createElement("p");
        summary.className = "text-[var(--marketing-muted)]";
        summary.textContent = "A short summary for the local visual fixture.";

        const action = document.createElement("button");
        action.className = "ai-news-action rounded-full border px-4 py-2";
        action.textContent = "Read article";
        action.type = "button";

        card.append(title, summary, action);
        main.append(card);

        // The DB-free listing is a preview, so exercise the production CTA's
        // descendant text-fill cascade alongside the synthetic content card.
        if (!main.querySelector(".ai-news-subscribe-action")) {
          const subscribe = document.createElement("a");
          subscribe.href = "/user";
          subscribe.className = "ai-news-subscribe-action inline-flex text-sm font-bold text-white px-4 py-2";
          const label = document.createElement("span");
          label.className = "relative z-10 inline-flex text-white";
          label.textContent = "User center";
          subscribe.append(label);
          main.append(subscribe);
        }
      });

      const result = await page.evaluate(async () => {
        const report = await (window as unknown as { axe: typeof axe }).axe.run(document, {
          runOnly: { type: "rule", values: ["color-contrast"] },
        });
        const card = document.querySelector<HTMLElement>(".ai-news-interactive-card");
        const heading = card?.querySelector<HTMLElement>("h2");
        const action = card?.querySelector<HTMLElement>("button");

        return {
          violations: report.violations,
          pageColor: getComputedStyle(document.querySelector("main.ai-news-page")!).color,
          themeTextColor: getComputedStyle(document.querySelector("main.ai-news-page")!).getPropertyValue("--marketing-text").trim(),
          cardBackground: card ? getComputedStyle(card).backgroundColor : "missing",
          headingColor: heading ? getComputedStyle(heading).color : "missing",
          actionBackground: action ? getComputedStyle(action).backgroundColor : "missing",
          actionColor: action ? getComputedStyle(action).color : "missing",
        };
      });

      expect(result.pageColor).toBe("rgb(0, 0, 0)");
      expect(result.themeTextColor).toMatch(/^#000(?:000)?$/);
      expect(result.cardBackground).toBe("rgb(255, 255, 255)");
      expect(result.headingColor).toBe("rgb(0, 0, 0)");
      expect(result.actionBackground).toBe("rgb(255, 255, 255)");
      expect(result.actionColor).toBe("rgb(0, 0, 0)");
      expect(result.violations).toEqual([]);

      const subscribeAction = page.locator(".ai-news-subscribe-action");
      await expect(subscribeAction).toBeVisible();
      const subscribeInk = await subscribeAction.evaluate((element) => {
        const textElement = element.querySelector("span") ?? element;
        return {
          background: getComputedStyle(element).backgroundColor,
          fill: getComputedStyle(textElement).webkitTextFillColor,
        };
      });
      expect(subscribeInk).toEqual({ background: "rgb(4, 98, 194)", fill: "rgb(255, 255, 255)" });

      const card = page.locator(".ai-news-interactive-card");
      const action = card.locator("button.ai-news-action");
      await card.hover();
      await expect
        .poll(() => card.evaluate((element) => getComputedStyle(element).transform))
        .not.toBe("none");
      await action.hover();
      await expect
        .poll(async () => {
          // Smooth scrolling can move this fixture after the first pointer move.
          await action.hover();
          return action.evaluate((element) => getComputedStyle(element).transform);
        })
        .not.toBe("none");

      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.mouse.move(0, 0);
      await card.hover();
      await expect
        .poll(() => card.evaluate((element) => getComputedStyle(element).transform))
        .toBe("none");
      await action.hover();
      await expect
        .poll(() => action.evaluate((element) => getComputedStyle(element).transform))
        .toBe("none");
    });
  }
}
