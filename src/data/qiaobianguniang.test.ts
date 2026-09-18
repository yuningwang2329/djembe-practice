import { describe, expect, it } from "vitest";
import { validateSong } from "../domain/song";
import { qiaobianguniang, qiaobianguniangBars } from "./qiaobianguniang";

describe("qiaobianguniang", () => {
  it("includes the 2/4 time signature bar in intro (Bar 5) matching the Martin score", () => {
    expect(qiaobianguniangBars.length).toBe(58);
    const bar5 = qiaobianguniangBars[4];
    expect(bar5.beats).toBe(2);
    expect(bar5.timeSignature).toEqual([2, 4]);
    expect(bar5.hits).toHaveLength(1);
    expect(bar5.hits[0]).toMatchObject({ stroke: "bass", hand: "R" });
    // 2/4 拍时长约为标准 4/4 拍的一半
    expect(bar5.endMs - bar5.startMs).toBeLessThan(1600);
    expect(bar5.endMs - bar5.startMs).toBeGreaterThan(1500);
  });

  it("aligns recording section transients with the 2/4 bar shift", () => {
    // 验证前奏、主歌、副歌等关键段落起始时间
    expect(qiaobianguniangBars[0].startMs).toBe(3111);
    // 第 5 小节 2/4 拍结束后，主歌在 17.08s 进唱鼓点
    const bar6 = qiaobianguniangBars[5];
    expect(Math.abs(bar6.startMs - 17077)).toBeLessThan(20);
    // 副歌在 57.42s 爆发
    const bar19 = qiaobianguniangBars[18];
    expect(Math.abs(bar19.startMs - 57423)).toBeLessThan(20);
    expect(qiaobianguniang.audioOffsetMs).toBe(0);
  });

  it("passes song validation", () => {
    expect(validateSong(qiaobianguniang)).toEqual([]);
  });

  it("places hits on the eighth-note grid inside their bars", () => {
    for (const bar of qiaobianguniangBars) {
      const eighthMs = (bar.endMs - bar.startMs) / (bar.beats * 2);
      for (const hit of bar.hits) {
        const slot = (hit.atMs - bar.startMs) / eighthMs;
        expect(Math.abs(slot - Math.round(slot))).toBeLessThan(0.01);
        expect(hit.atMs).toBeGreaterThanOrEqual(bar.startMs);
        expect(hit.atMs).toBeLessThan(bar.endMs);
      }
    }
  });

  it("follows the Martin sheet music patterns", () => {
    // 第 1 小节 = 基本型 A：B ｜ SB ｜ B ｜ S
    const first = qiaobianguniangBars[0];
    expect(first.hits.map((hit) => hit.stroke)).toEqual([
      "bass",
      "slap",
      "bass",
      "bass",
      "slap",
    ]);
    expect(first.hits.map((hit) => hit.hand)).toEqual(["R", "R", "L", "R", "R"]);

    // 第 4 小节 = B ｜ SB ｜ BB ｜ S
    const fourth = qiaobianguniangBars[3];
    expect(fourth.hits.map((hit) => hit.hand)).toEqual(["R", "R", "L", "R", "L", "R"]);

    // 第 5 小节 = 2/4 拍 B 0
    const fifth = qiaobianguniangBars[4];
    expect(fifth.timeSignature).toEqual([2, 4]);
    expect(fifth.hits.map((hit) => hit.stroke)).toEqual(["bass"]);

    // 第 18 小节 = 主歌过渡收束 B ｜ B ｜ B ｜ 0
    const bar18 = qiaobianguniangBars[17];
    expect(bar18.hits.map((hit) => hit.stroke)).toEqual(["bass", "bass", "bass"]);

    // 副歌推进型含 SS 双掌击（如第 22 小节）
    const bar22 = qiaobianguniangBars[21];
    expect(bar22.hits.map((hit) => hit.stroke)).toEqual([
      "bass",
      "slap",
      "bass",
      "bass",
      "bass",
      "slap",
      "slap",
    ]);
  });

  it("keeps reference lyric cues independent of bars", () => {
    const cues = qiaobianguniang.lyrics!;
    expect(cues[0]).toMatchObject({ startMs: 17180, endMs: 22340 });
    expect(cues[0].text).toContain("是谁家的姑娘");
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
    expect(qiaobianguniang.expectedDurationMs - lastBar!.endMs).toBeLessThan(4000);
  });
});
