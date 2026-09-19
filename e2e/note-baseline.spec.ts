import { expect, test } from "@playwright/test";

/**
 * 同一行内所有音符字母必须底边对齐——大小写（B/b、S/s）与音符时值都不应改变
 * 字母的高低，快慢只由横梁体现（一横 = 八分，两横 = 十六分）。
 *
 * 曾经八分音符的横梁是用 border-bottom 画的：元素加了边框、在 align-items:
 * flex-end 的父级里内容被顶高 2.5px，于是"有横梁的音符"比"没有横梁的"高一截。
 * 改成绝对定位画线后，实测所有字母底边完全一致。
 */
test("note letters sit on one baseline regardless of case or note value", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始练习 桥边姑娘" }).click();
  await page.waitForTimeout(300);

  const rows = await page.evaluate(() => {
    const byRow: number[][] = [];
    for (const block of document.querySelectorAll(".score-page__block")) {
      const bottoms: number[] = [];
      for (const letter of block.querySelectorAll(".score-char__letter")) {
        bottoms.push(Math.round(letter.getBoundingClientRect().bottom * 10) / 10);
      }
      if (bottoms.length > 2) byRow.push(bottoms);
    }
    return byRow;
  });

  expect(rows.length, "一个谱面行都没测到，选择器可能变了").toBeGreaterThan(0);
  for (const [i, bottoms] of rows.entries()) {
    const spread = Math.max(...bottoms) - Math.min(...bottoms);
    expect(spread, `第 ${i + 1} 行字母底边不齐，相差 ${spread.toFixed(1)}px`).toBeLessThan(1);
  }
});
