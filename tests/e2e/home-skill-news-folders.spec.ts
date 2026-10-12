import { expect, test } from '@playwright/test';
for (const prefix of ['', '/en']) {
  test(`skill and news folder destinations ${prefix || 'zh'}`, async ({ page }) => {
    const groups = [
      ['/skill-learning/ai-prompt-management', '/ai-skills'],
      ['/ai-news/topics/ai-agent', '/ai-news/topics/local-ai', '/ai-news/topics/open-source-models', '/ai-news/topics/ai-tutorials', '/ai-news/topics/ai-regulation'],
    ];
    for (const [group, paths] of groups.entries()) {
      for (const [index, path] of paths.entries()) {
        await page.goto(prefix || '/');
        const folder = page.locator('.redesign-home-features .folder-float').nth(group + 1);
        const trigger = folder.locator('.folder-float__trigger');
        await trigger.scrollIntoViewIfNeeded(); await trigger.focus(); await page.keyboard.press('Enter');
        await expect(folder.locator('.folder-float__item')).toHaveCount(paths.length);
        await folder.locator('.folder-float__item').nth(index).focus(); await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`${prefix}${path}$`));
      }
    }
  });
  test(`news options fit phones and blue language switch ${prefix || 'zh'}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1000 }); await page.goto(prefix || '/');
    const trigger = page.locator('.redesign-home-features .folder-float').nth(2).locator('.folder-float__trigger');
    await trigger.scrollIntoViewIfNeeded(); await trigger.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(1000);
    for (const option of await page.locator('.redesign-home-features .folder-float').nth(2).locator('.folder-float__item').all()) {
      const bounds = (await option.boundingBox())!; expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await expect(page.locator('.enhe-language-toggle .squish-switch__track').first()).toHaveCSS('background-color', 'rgb(4, 98, 194)');
  });
}
