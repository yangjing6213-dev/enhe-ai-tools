import { expect, test } from '@playwright/test';
for (const prefix of ['', '/en']) {
  test(`skill and news folders expose real localized destinations ${prefix || 'zh'}`, async ({ page }) => {
    const groups = [
      {
        paths: ['/skill-learning/ai-prompt-management', '/ai-skills', '/ai-workflows'],
        labels: prefix ? ['AI prompts', 'AI Skills', 'AI workflows'] : ['AI 提示词', 'AI Skills', 'AI 工作流'],
      },
      {
        paths: ['/ai-news/topics/ai-agent', '/ai-news/topics/local-ai', '/ai-news/topics/open-source-models', '/ai-news/topics/ai-tutorials', '/ai-news/topics/ai-regulation'],
        labels: prefix ? ['AI agents', 'Local AI', 'Open-source models', 'AI tutorials', 'AI regulation'] : ['AI 智能体', 'AI 本地部署', '开源大模型', 'AI 技能教程', 'AI 监管与安全'],
      },
    ];
    await page.goto(prefix || '/');
    for (const [group, { paths, labels }] of groups.entries()) {
      const folder = page.locator('.redesign-home-features .folder-float').nth(group + 1);
      const trigger = folder.locator('.folder-float__trigger');
      await trigger.scrollIntoViewIfNeeded(); await trigger.focus(); await page.keyboard.press('Enter');
      await expect(folder).toHaveAttribute('open','');
      const options = folder.locator('.folder-float__item');
      await expect(options).toHaveCount(paths.length);
      for (const [index, path] of paths.entries()) {
        await expect(options.nth(index)).toContainText(labels[index]);
        await expect(options.nth(index)).toHaveAttribute('href', `${prefix}${path}`);
      }
      if (group === 0) {
        await page.keyboard.press('Escape');
        await expect(folder).not.toHaveAttribute('open', '');
      }
    }
    const skillFolder = page.locator('.redesign-home-features .folder-float').nth(1);
    await skillFolder.locator('.folder-float__trigger').focus();
    await page.keyboard.press('Enter');
    await expect(skillFolder).toHaveAttribute('open', '');
    const workflowLink = skillFolder.locator(`a[href="${prefix}/ai-workflows"]`);
    await workflowLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(new RegExp(`${prefix}/ai-workflows$`), { waitUntil: 'commit' });
  });
  test(`news options fit phones and blue language switch ${prefix || 'zh'}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1000 }); await page.goto(prefix || '/');
    const trigger = page.locator('.redesign-home-features .folder-float').nth(2).locator('.folder-float__trigger');
    await trigger.scrollIntoViewIfNeeded(); await trigger.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.redesign-home-features .folder-float').nth(2)).toHaveAttribute('open',''); await page.waitForTimeout(1000);
    for (const option of await page.locator('.redesign-home-features .folder-float').nth(2).locator('.folder-float__item').all()) {
      const bounds = (await option.boundingBox())!; expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await expect(page.locator('.enhe-language-toggle .squish-switch__track').first()).toHaveCSS('background-color', 'rgb(4, 98, 194)');
  });
  test(`workflow links work without JavaScript ${prefix || 'zh'}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      const home = prefix || '/';
      await page.goto(home);
      const folder = page.locator('.redesign-home-features .folder-float').nth(1);
      const summary = folder.locator('.folder-float__trigger');
      await expect(summary).toBeVisible();
      await summary.click();
      await expect(folder).toHaveAttribute('open','');
      const href = `${prefix}/ai-workflows`;
      const workflowLink = folder.locator(`a[href="${href}"]`);
      await expect(workflowLink).toBeVisible();
      await page.waitForTimeout(800);
      await workflowLink.click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/ai-workflows$`));
    } finally {
      await context.close();
    }
  });
}
