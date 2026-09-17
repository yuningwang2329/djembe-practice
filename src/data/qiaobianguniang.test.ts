import { describe, expect, it } from "vitest";
import { validateSong } from "../domain/song";
import { qiaobianguniang, qiaobianguniangBars } from "./qiaobianguniang";

describe("qiaobianguniang", () => {
  it("passes song validation", () => {
    expect(validateSong(qiaobianguniang)).toEqual([]);
  });

  it("places hits on the eighth-note grid inside their bars", () => {
    for (const bar of qiaobianguniangBars) {
      const eighthMs = (bar.endMs - bar.startMs) / 8;
      for (const hit of bar.hits) {
        const slot = (hit.atMs - bar.startMs) / eighthMs;
        expect(Math.abs(slot - Math.round(slot))).toBeLessThan(0.01);
        expect(hit.atMs).toBeGreaterThanOrEqual(bar.startMs);
        expect(hit.atMs).toBeLessThan(bar.endMs);
      }
    }
  });

  it("follows the official 阿波 score patterns with marked hands", () => {
    // 第 1 小节 = 基本型 A：B ｜ SB ｜ B ｜ S（SB 中 S 右、B 左）
    const first = qiaobianguniangBars[0];
    expect(first.hits.map((hit) => hit.stroke)).toEqual([
      "bass",
      "slap",
      "bass",
      "bass",
      "slap",
    ]);
    expect(first.hits.map((hit) => hit.hand)).toEqual(["R", "R", "L", "R", "R"]);
    // 第 4 小节 = B ｜ SB ｜ BB ｜ S：BB 为右左
    const fourth = qiaobianguniangBars[3];
    expect(fourth.hits.map((hit) => hit.hand)).toEqual(["R", "R", "L", "R", "L", "R"]);
    // 进唱第 3 行（第 17 小节起）第 4 拍 S 用左手
    const bar17 = qiaobianguniangBars[16];
    expect(bar17.hits.at(-1)).toMatchObject({ stroke: "slap", hand: "L" });
    // 副歌结束句 D：B ｜ B ｜ B ｜ 0（第 36 小节）
    const bar36 = qiaobianguniangBars[35];
    expect(bar36.hits.map((hit) => hit.stroke)).toEqual(["bass", "bass", "bass"]);
    // 间奏全休止（第 25–28 小节）
    for (const bar of qiaobianguniangBars.slice(24, 28)) {
      expect(bar.hits).toHaveLength(0);
    }
  });

  it("labels sections at their first bars and aligns lyrics bar by bar", () => {
    const sectionAt = (barNumber: number) => qiaobianguniangBars[barNumber - 1].section;
    expect(sectionAt(1)).toBe("前奏");
    expect(sectionAt(9)).toBe("进唱");
    expect(sectionAt(25)).toBe("间奏");
    expect(sectionAt(29)).toBe("副歌");
    expect(sectionAt(53)).toBe("尾奏");
    expect(qiaobianguniangBars[1].section).toBeUndefined();

    const lyricAt = (barNumber: number) => qiaobianguniangBars[barNumber - 1].lyric;
    expect(lyricAt(9)).toBe("暖阳下");
    expect(lyricAt(11)).toBe("是谁家的姑娘");
    expect(qiaobianguniangBars[10].lyricSpan).toBe(2);
    expect(lyricAt(21)).toBe("你说");
    expect(lyricAt(29)).toBe("风华模样");
    expect(lyricAt(49)).toBe("我把你放心房");
    expect(lyricAt(51)).toBe("不想让你流浪");
    // 每个歌词词组都在 4 小节的谱面行内，不跨行
    qiaobianguniangBars.forEach((bar, index) => {
      if (!bar.lyricSpan || bar.lyricSpan <= 1) return;
      const col = index % 4;
      expect(col + bar.lyricSpan).toBeLessThanOrEqual(4);
    });
  });

  it("covers the measured audio duration without overflowing", () => {
    const lastBar = qiaobianguniangBars.at(-1);
    expect(lastBar).toBeDefined();
    expect(lastBar!.endMs).toBeLessThanOrEqual(qiaobianguniang.expectedDurationMs);
    // 谱面结尾与音频结尾相距不超过一个小节
    expect(qiaobianguniang.expectedDurationMs - lastBar!.endMs).toBeLessThan(4000);
  });
});
