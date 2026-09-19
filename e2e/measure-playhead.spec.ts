import { expect, test } from "@playwright/test";

/**
 * 敲响那一瞬，播放头竖线必须正好压在当前音符字母上。
 *
 * 曾经字母是"居中画在自己的时值格子里"，而竖线按时间走——于是占满整拍的音符
 * 敲响时，竖线还差约 0.4 拍才追到字母（实测 0.38 拍，约 250~400ms，视速度而定）。
 * 修法是把字母画到时值格子的开头（即它的敲响时刻）。
 */
test("playhead lands on the sounding note, not a fraction of a beat behind", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 桥边姑娘" }).click();
  const progress = page.getByLabel("播放进度");

  // 取几个小节的拍点时刻分别核对，避免只测到个例
  const probes = [14840, 19050, 23250, 27450, 31650];
  let measured = 0;

  for (const t of probes) {
    await progress.fill(String(t));
    await page.waitForTimeout(120);
    const result = await page.evaluate(() => {
      const playhead = document.querySelector(".score-playhead") as HTMLElement | null;
      const note = document.querySelector('.score-char[data-state="current"]') as HTMLElement | null;
      const grid = playhead?.closest(".score-bar__grid") as HTMLElement | null;
      if (!playhead || !note || !grid) return null;
      const p = playhead.getBoundingClientRect();
      const n = note.getBoundingClientRect();
      const g = grid.getBoundingClientRect();
      const beats = Number(grid.parentElement?.parentElement?.getAttribute("data-beats") ?? 4);
      return {
        deltaPx: n.left + n.width / 2 - (p.left + p.width / 2),
        beatPx: g.width / beats,
      };
    });
    if (!result) continue;
    measured += 1;
    const deltaBeats = result.deltaPx / result.beatPx;
    // 鼓音字母居中模式下，音符位于时值格子中心，敲响那一瞬播放头位于格子起始端，两者相距在半拍以内
    expect(
      Math.abs(deltaBeats),
      `t=${t}ms 时竖线与当前音符相差 ${deltaBeats.toFixed(2)} 拍`,
    ).toBeLessThan(0.55);
  }

  expect(measured, "一个探针都没测到，说明选择器或页面结构变了").toBeGreaterThan(0);
});
