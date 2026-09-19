import { expect, test } from "@playwright/test";

/**
 * 验证歌词变色与竖线播放头严格同步：
 * 播放头到达哪拍/哪个字，哪个字点亮；
 * 播放头尚未到达的字，绝对保持 idle 状态，严禁出现"竖线才刚过半，颜色都跑完了"的脱节现象。
 */
test("lyric color change synchronizes strictly with playhead line across beats", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 我是人间惆怅客" }).click();
  const progress = page.getByLabel("播放进度");

  // 第 12 小节（约 42315ms ~ 46008ms）。在 43800ms 时，由于超前量，播放头正进入第 3 拍
  await progress.fill("43800");
  await page.waitForTimeout(300);

  const states = await page.evaluate(() => {
    const bar12 = document.querySelector('article[aria-label="第 12 小节"]');
    if (!bar12) return [];
    const block = bar12.closest('.score-page__block');
    const placedChars = Array.from(block?.querySelectorAll('.score-lyric__char--placed') ?? []);
    return placedChars.slice(-8).map(el => ({
      text: el.textContent,
      state: el.getAttribute('data-state'),
    }));
  });

  expect(states).toHaveLength(8);
  // 前两拍已走过："没、有、一、扇" 全部为 past
  expect(states.find(c => c.text === "没")?.state).toBe("past");
  expect(states.find(c => c.text === "有")?.state).toBe("past");
  expect(states.find(c => c.text === "一")?.state).toBe("past");
  expect(states.find(c => c.text === "扇")?.state).toBe("past");
  // 第 3 拍当前字："为" 为 current
  expect(states.find(c => c.text === "为")?.state).toBe("current");
  // 播放头尚未到达的字："我、开、启" 严格为 idle，绝不能提前变色
  expect(states.find(c => c.text === "我")?.state).toBe("idle");
  expect(states.find(c => c.text === "开")?.state).toBe("idle");
  expect(states.find(c => c.text === "启")?.state).toBe("idle");
});
