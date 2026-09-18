import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("song lyric cues follow seeking and leave the instrumental gap clear", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 桥边姑娘" }).click();
  const progress = page.getByLabel("播放进度");
  await progress.fill("18000");
  const active = page.locator('.score-lyric[data-state="current"]');
  await expect(active).toHaveCount(1);
  await expect(active).toContainText("是谁家的姑娘");
  await page.screenshot({ path: "test-results/qiao-lyrics-landscape.png" });
  await progress.fill("90000");
  await expect(active).toHaveCount(0);
  await progress.fill("123000");
  await expect(active).toHaveCount(1);
  await expect(active).toContainText("风华模样");
});

test("continuous score previews the next row and crosses the old page boundary without jumping", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 桥边姑娘" }).click();
  const progress = page.getByLabel("播放进度");
  const viewport = page.locator('.score-viewport');
  await expect(page.locator('.score-bar')).toHaveCount(58);
  await progress.fill('40260');
  const before = await viewport.evaluate((el) => el.scrollTop);
  const nextRow = await page.getByLabel('第 13 小节', { exact: true }).boundingBox();
  const view = await viewport.boundingBox();
  expect(nextRow!.y).toBeGreaterThan(view!.y);
  expect(nextRow!.y + nextRow!.height).toBeLessThan(view!.y + view!.height);
  await progress.fill('40280');
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

test("portrait remains operable and asks the player to rotate", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 暖身律动" }).click();

  await expect(page.getByText("横屏可同时看到三行谱面")).toBeVisible();
  await expect(page.getByRole("button", { name: "开始播放" })).toBeVisible();
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
