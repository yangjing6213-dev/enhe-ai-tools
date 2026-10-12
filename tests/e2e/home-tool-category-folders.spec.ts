import { expect, test } from '@playwright/test';

const categories = ['video','image','audio','agent','efficiency'];
for (const locale of ['zh','en']) {
  test(`all five folder categories navigate correctly in ${locale}`, async ({page}) => {
    const home = locale === 'en' ? '/en' : '/';
    const listing = locale === 'en' ? '/en/software' : '/software';
    for (const [index, category] of categories.entries()) {
      await page.goto(home);
      const folder = page.locator('.redesign-home-features .folder-float').first();
      const trigger = folder.locator('.folder-float__trigger');
      await trigger.scrollIntoViewIfNeeded();
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(trigger).toHaveAttribute('aria-expanded','true');
      await expect(folder.locator('.folder-float__item')).toHaveCount(5);
      const option = folder.locator('.folder-float__item').nth(index);
      await option.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${listing}\\?category=${category}$`));
    }
  });
}

for (const width of [320,768,1440]) {
  test(`five category options fit the viewport at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:1000});
    for(const home of ['/','/en']) {
      await page.goto(home);
      const folder = page.locator('.redesign-home-features .folder-float').first();
      const trigger=folder.locator('.folder-float__trigger');
      await trigger.scrollIntoViewIfNeeded();
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(trigger).toHaveAttribute('aria-expanded','true');
      await page.waitForTimeout(1000);
      for(const option of await folder.locator('.folder-float__item').all()) {
        const bounds=(await option.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });
}
