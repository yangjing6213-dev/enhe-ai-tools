import { expect, test } from "@playwright/test";

test("product video preview keeps its rounded rectangle shape outside the homepage", async ({ page }) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  const style = await page.evaluate(() => {
    const host = document.querySelector(".enhe-redesign-production") ?? document.body;
    const preview = document.createElement("button");
    preview.className = "tool-detail-video-stage tool-detail-video-preview";
    preview.style.width = "640px";
    preview.innerHTML = "<span></span>";
    host.append(preview);
    const computed = getComputedStyle(preview);
    const result = {
      borderRadius: computed.borderRadius,
      aspectRatio: computed.aspectRatio,
      overflow: computed.overflow,
    };
    preview.remove();
    return result;
  });

  expect(style.borderRadius).toBe("12px");
  expect(style.aspectRatio).toBe("16 / 9");
  expect(style.overflow).toBe("hidden");
});
