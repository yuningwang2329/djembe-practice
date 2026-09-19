import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("cached audio supports tap-to-play after an offline restart", async ({page, context}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', {name:'开始练习 暖身律动'}).click();
  await page.locator('[data-hit-at="18250"]').click();
  await expect(page.getByRole('button', {name:'暂停播放'})).toBeVisible();
  await expect.poll(() => page.getByLabel('播放进度').inputValue()).toMatch(/^18\d{3}(\.\d+)?$/);
});

test("tapping a hit starts there and exits a loop that would pull playback elsewhere", async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始练习 暖身律动' }).click();
  await page.getByRole('button', { name: '小节循环' }).click();
  await page.locator('[data-hit-at="18250"]').click();
  await expect(page.getByRole('button', { name: '暂停播放' })).toBeVisible();
  await expect(page.getByRole('button', { name: '小节循环' })).toHaveAttribute('aria-pressed', 'false');
  const progress = page.getByLabel('播放进度');
  await expect.poll(() => progress.inputValue()).toMatch(/^18\d{3}(\.\d+)?$/);
  await page.getByRole('button', { name: '暂停播放' }).click();
  await page.getByLabel('第 3 小节', { exact: true }).locator('.score-bar__no').click();
  await expect(page.getByRole('button', { name: '暂停播放' })).toBeVisible();
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThanOrEqual(4000);
  expect(Number(await progress.inputValue())).toBeLessThan(5500);
});

test("tapping the score cancels count-in and plays immediately", async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始练习 暖身律动' }).click();
  await page.getByRole('button', { name: '开始播放', exact: true }).click();
  await expect(page.locator('.count-in')).toBeVisible();
  await page.locator('[data-hit-at="4000"]').click();
  await expect(page.locator('.count-in')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '暂停播放' })).toBeVisible();
  await expect.poll(async () => Number(await page.getByLabel('播放进度').inputValue()), { timeout: 10000 }).toBeGreaterThan(4000);
});

test("song lyric cues follow seeking and leave the instrumental gap clear", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 桥边姑娘" }).click();
  const progress = page.getByLabel("播放进度");
  await progress.fill("18000");
  const active = page.locator('.score-lyric[data-state="current"]');
  await expect(active).toHaveCount(1);
  await expect(active).toContainText("暖阳下");
  await page.screenshot({ path: "test-results/qiao-lyrics-landscape.png" });
  await progress.fill("90000");
  await expect(active).toHaveCount(0);
  await progress.fill("123000");
  await expect(active).toHaveCount(1);
  await expect(active).toContainText("你说无人在身旁");
});

test("continuous score previews the next row and crosses the old page boundary without jumping", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 桥边姑娘" }).click();
  const progress = page.getByLabel("播放进度");
  const viewport = page.locator('.score-viewport');
  await expect(page.locator('.score-bar')).toHaveCount(58);
  await progress.fill('40340');
  const before = await viewport.evaluate((el) => el.scrollTop);
  const nextRow = await page.getByLabel('第 13 小节', { exact: true }).boundingBox();
  const view = await viewport.boundingBox();
  expect(nextRow!.y).toBeGreaterThan(view!.y);
  expect(nextRow!.y + nextRow!.height).toBeLessThan(view!.y + view!.height);
  await progress.fill('40360');
  const after = await viewport.evaluate((el) => el.scrollTop);
  expect(after).toBeGreaterThanOrEqual(before);
  expect(after - before).toBeLessThan(3);
  await progress.fill('45000');
  expect(await viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(after);
  await page.screenshot({ path: 'test-results/continuous-score-landscape.png' });
  await page.waitForTimeout(200);
  const paused = await viewport.evaluate((el) => el.scrollTop);
  await page.waitForTimeout(200);
  expect(await viewport.evaluate((el) => el.scrollTop)).toBe(paused);
  await progress.fill('18000');
  expect(await viewport.evaluate((el) => el.scrollTop)).toBeLessThan(paused);
});

test("iPad landscape practice controls stay large, independent and usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "曲目库" })).toBeVisible();
  await page.getByRole("button", { name: "开始练习 暖身律动" }).click();

  await expect(page.getByLabel("可跟练鼓谱")).toBeVisible();
  await expect(page.locator(".score-bar")).toHaveCount(16);
  await expect(page.getByText("内置伴奏 · 离线可用")).toBeVisible();

  const originalTrack = page.getByRole("button", { name: "原歌曲音轨" });
  const drumTrack = page.getByRole("button", { name: "示范鼓声音轨" });
  await originalTrack.click();
  await expect(originalTrack).toHaveAttribute("aria-pressed", "false");
  await expect(drumTrack).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "加速" }).click();
  await expect(page.getByLabel("当前速度")).toHaveText("1.05×");
  await page.getByRole("button", { name: "小节循环" }).click();
  await expect(page.getByRole("button", { name: "小节循环" })).toHaveAttribute("aria-pressed", "true");
});

test("portrait remains operable", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 桥边姑娘" }).click();

  await expect(page.getByLabel("可跟练鼓谱")).toBeVisible();
  await expect(page.getByRole("button", { name: "开始播放" })).toBeVisible();
  await page.screenshot({ path: "/Users/wangyuning/.gemini/antigravity/brain/a10bbffc-5acb-44ad-a396-07837d408051/portrait-6rows-preview.png" });
});

test("an imported family track remains available after reopening the app", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 暖身律动" }).click();
  const audioBytes = await readFile("public/audio/demo-groove.wav");

  await page.getByLabel("导入原歌曲").setInputFiles({
    name: "family-song.mp3",
    mimeType: "audio/mpeg",
    buffer: audioBytes,
  });
  await expect(page.getByText("已保存到此 iPad · 离线可用")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "开始练习 暖身律动" }).click();
  await expect(page.getByText("已保存到此 iPad · 离线可用")).toBeVisible();
});

test("the installed app shell opens again while offline", async ({ context, page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) throw new Error("Service Worker unavailable");
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "曲目库" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始练习 暖身律动" })).toBeVisible();
});
