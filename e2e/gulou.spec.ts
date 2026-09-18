import { expect, test } from '@playwright/test';

test('Gulou preserves dense soft strokes on iPad, follows the score and opens offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.getByRole('button', { name: '开始练习 鼓楼', exact: true }).click();
  await expect(page.locator('.score-bar')).toHaveCount(128);
  await expect(page.getByText('小写 b/s：轻击')).toBeVisible();
  await page.getByLabel('播放进度').fill('72000');
  const fill = page.getByLabel('第 32 小节', { exact: true });
  await expect(fill.locator('[data-hit-at]')).toHaveCount(13);
  const lastBeat = fill.locator('.score-beat').last();
  const beatRect = await lastBeat.boundingBox();
  for (const note of await lastBeat.locator('.score-char').all()) {
    const rect = await note.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(beatRect!.x - 2);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(beatRect!.x + beatRect!.width + 2);
  }
  await page.screenshot({ path: 'test-results/gulou-landscape.png' });
  await page.getByLabel('播放进度').fill('150000');
  await expect(page.locator('.score-lyric[data-state="current"]')).toHaveCount(0);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '开始练习 鼓楼', exact: true }).click();
  await expect(page.locator('.score-bar')).toHaveCount(128);
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.getByLabel('播放进度').fill('72000');
  await page.screenshot({ path: 'test-results/gulou-portrait.png' });
});
