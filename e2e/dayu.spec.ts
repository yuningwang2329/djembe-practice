import { expect, test } from "@playwright/test";

test("Dayu registers the full score, keeps interludes clear and follows playback", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 大鱼", exact: true }).click();
  await expect(page.locator(".score-bar")).toHaveCount(83);
  await expect(page.getByText("尾奏·休止")).toBeVisible();

  const progress = page.getByLabel("播放进度");
  // 主歌一进歌：当前歌词为「海浪无声…」，高亮小节在第 6 小节附近
  await progress.fill("43500");
  const active = page.locator('.score-lyric[data-state="current"]');
  // The same cue is split into notation-aligned bar fragments, not duplicated.
  await expect.poll(async()=>(await active.allTextContents()).join('')).toContain("海浪无声");
  expect(await active.evaluateAll(els=>new Set(els.map(el=>el.getAttribute('data-cue-start'))).size)).toBe(1);
  // 钢琴引子与间奏留白
  await progress.fill("20000");
  await expect(page.locator('.score-lyric[data-state="current"]')).toHaveCount(0);
  await progress.fill("130000");
  await expect(page.locator('.score-lyric[data-state="current"]')).toHaveCount(0);
  // 长尾奏无歌词
  await progress.fill("260000");
  await expect(page.locator('.score-lyric[data-state="current"]')).toHaveCount(0);
  await page.screenshot({ path: "test-results/dayu-outro.png" });

  // 尾奏第 1 小节是密集十六分组，第 63 小节为单音收束
  const bar63 = page.getByLabel("第 63 小节", { exact: true });
  await expect(bar63.locator("[data-hit-at]")).toHaveCount(1);
  const bar50 = page.getByLabel("第 50 小节", { exact: true });
  await expect(bar50.locator("[data-hit-at]")).toHaveCount(16);
});
