import { expect, test } from "@playwright/test";

test("visual lead moves the cursor but never the lyric or sounding-note clock", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem('djembe.visualLeadMs','0'));
  await page.reload();
  await page.getByRole("button", { name: "开始练习 桥边姑娘" }).click();
  const progress = page.getByLabel("播放进度");
  await progress.fill('18000');
  const snapshot=()=>page.evaluate(()=>({
    cursor:document.querySelector('.score-playhead')?.getAttribute('style'),
    lyrics:[...document.querySelectorAll('.score-lyric')].map(el=>el.getAttribute('data-state')),
    notes:[...document.querySelectorAll('.score-char')].map(el=>el.getAttribute('data-state')),
  }));
  const before=await snapshot();
  expect(before.lyrics.length).toBeGreaterThan(0);
  for(let i=0;i<10;i++) await page.getByRole('button',{name:'画面提前量增加'}).click();
  const after=await snapshot();
  expect(after.cursor).not.toBe(before.cursor);
  expect(after.lyrics).toEqual(before.lyrics);
  expect(after.notes).toEqual(before.notes);
  expect(Number(await progress.inputValue())).toBe(18000);
});
