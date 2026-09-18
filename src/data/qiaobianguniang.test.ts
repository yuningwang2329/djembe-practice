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

  it("keeps reference lyric cues independent of bars, including the instrumental gap and reprise", () => {
    const cues = qiaobianguniang.lyrics!;
    expect(qiaobianguniangBars.every((bar) => !bar.lyric)).toBe(true);
    expect(cues[0]).toMatchObject({ startMs: 17180, endMs: 22340 });
    expect(cues[0].text).toContain("是谁家的姑娘");
    expect(cues.some((cue) => cue.startMs <= 90000 && cue.endMs > 90000)).toBe(false);
    expect(cues.filter((cue) => cue.text === "风华模样 你落落大方")).toHaveLength(2);
    cues.forEach((cue, i) => {
      expect(cue.endMs).toBeGreaterThan(cue.startMs);
      expect(cue.endMs).toBeLessThanOrEqual(qiaobianguniang.expectedDurationMs);
      if (i) expect(cue.startMs).toBeGreaterThanOrEqual(cues[i - 1].endMs);
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
