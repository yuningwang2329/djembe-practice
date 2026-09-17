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
    // 主歌二后半段（第 18 小节起）第 4 拍 S 用左手
    const bar18 = qiaobianguniangBars[17];
    expect(bar18.hits.at(-1)).toMatchObject({ stroke: "slap", hand: "L" });
    // 尾奏弱唱段全休止（第 53–57 小节），第 58 小节单音收尾
    for (const bar of qiaobianguniangBars.slice(52, 57)) {
      expect(bar.hits).toHaveLength(0);
    }
    const bar58 = qiaobianguniangBars[57];
    expect(bar58.hits.map((hit) => hit.stroke)).toEqual(["bass"]);
  });

  it("labels sections at their first bars and aligns all 24 lyric sentences", () => {
    const sectionAt = (barNumber: number) => qiaobianguniangBars[barNumber - 1].section;
    expect(sectionAt(1)).toBe("前奏");
    expect(sectionAt(5)).toBe("主歌一");
    expect(sectionAt(13)).toBe("主歌二");
    expect(sectionAt(21)).toBe("副歌");
    expect(sectionAt(33)).toBe("主歌三");
    expect(sectionAt(49)).toBe("副歌");
    expect(sectionAt(53)).toBe("尾奏");
    expect(qiaobianguniangBars[1].section).toBeUndefined();

    const lyricBars = qiaobianguniangBars.filter((bar) => bar.lyric);
    // 26 句歌词，每句 2 小节，覆盖第 5–56 小节的人声部分
    expect(lyricBars).toHaveLength(26);
    for (const bar of lyricBars) expect(bar.lyricSpan).toBe(2);
    expect(lyricBars[0].number).toBe(5);
    expect(lyricBars.at(-1)!.number).toBe(55);

    const lyricAt = (barNumber: number) => qiaobianguniangBars[barNumber - 1].lyric;
    expect(lyricAt(5)).toBe("暖阳下 我迎芬芳");
    expect(lyricAt(7)).toBe("是谁家的姑娘");
    expect(lyricAt(27)).toBe("我把你放心上 刻在了我心膛");
    expect(lyricAt(33)).toBe("暖阳下 的桥头旁");
    expect(lyricAt(37)).toBe("她有着长长的乌黑发");
    expect(lyricAt(47)).toBe("一个人在流浪");
    expect(lyricAt(55)).toContain("不想让你流浪");
  });

  it("covers the measured audio duration without overflowing", () => {
    const lastBar = qiaobianguniangBars.at(-1);
    expect(lastBar).toBeDefined();
    expect(lastBar!.endMs).toBeLessThanOrEqual(qiaobianguniang.expectedDurationMs);
    // 谱面结尾与音频结尾相距不超过一个小节
    expect(qiaobianguniang.expectedDurationMs - lastBar!.endMs).toBeLessThan(4000);
  });
});
