import { describe, expect, it } from "vitest";
import { dayu, dayuBars } from "./dayu";
import { validateSong } from "../domain/song";
import { songLibrary } from "./demoSong";

describe("大鱼 / 用户提供录音与马丁教学谱", () => {
  it("registers 83 bars with the printed sections and leaves the piano lead-in intact", () => {
    expect(songLibrary).toContain(dayu);
    expect(validateSong(dayu)).toEqual([]);
    expect(dayu.bars).toHaveLength(83);
    expect(dayu.bars[0].startMs).toBe(26220);
    expect(dayu.bars[0].startMs).toBeGreaterThan(20000); // 前 26s 为谱外钢琴引子
    expect(dayu.bars.at(-1)!.endMs).toBeLessThan(dayu.expectedDurationMs);
    expect(dayu.bars.filter((b) => b.section).map((b) => b.number)).toEqual([
      1, 6, 22, 30, 34, 50, 57, 64,
    ]);
    expect(dayu.bars.slice(63).every((b) => b.hits.length <= 1)).toBe(true);
  });

  it("matches independently measured vocal anchors at the section entries", () => {
    // 22050Hz PCM 实测人声起音：主歌一 43.17s、主歌二 138.35s；
    // 副歌二唱腔 192.24s 落在第 50 小节第 1 拍之后（周深提前进入的演唱处理，
    // 故容限放宽到一拍内）。容限远小于一个小节，防止网格整体滑移。
    const anchors: Array<[number, number, number]> = [
      [6, 43170, 100],
      [34, 138350, 100],
      [50, 192240, 600],
    ];
    for (const [number, measuredMs, tolerance] of anchors) {
      expect(Math.abs(dayu.bars[number - 1].startMs - measuredMs)).toBeLessThan(tolerance);
    }
  });

  it("keeps the 16-bar verses and the soft ghost strokes from the printed score", () => {
    expect(dayu.bars).toHaveLength(83);
    // 主歌一 16 小节（8+7+1）
    expect(dayu.bars[5].section).toBe("主歌一");
    expect(dayu.bars[21].section).toBe("副歌一");
    // 主歌二 16 小节（7+1+7+1，谱面 18 小节反复按录音取舍）
    expect(dayu.bars[33].section).toBe("主歌二");
    expect(dayu.bars[49].section).toBe("副歌二");
    // 谱面带斜杠的弱音（Ṡ）保留为 soft：主歌一第 1 小节第 2 拍
    const verseA = dayu.bars[5].hits;
    expect(verseA.some((h) => h.dynamics === "soft")).toBe(true);
    // 副歌二密集十六分：第 50 小节四个十六分分组齐全（谱面小写 = 十六分记法，
    // 力度正常；此曲 soft 仅来自带斜杠的弱音）
    const chorus2 = dayu.bars[49].hits;
    expect(chorus2).toHaveLength(16);
    expect(chorus2.filter((h) => h.dynamics === "soft")).toHaveLength(0);
    // 弱音小节：间奏第 1 小节（谱面 Ṡss）
    expect(dayu.bars[29].hits.filter((h) => h.dynamics === "soft")).toHaveLength(1);
  });

  it("keeps all 24 supplied lyric cues and clears them through instrumental gaps", () => {
    expect(dayu.lyrics).toHaveLength(24);
    // 钢琴引子、间奏（约 124.8–138.3s）与长尾奏均无歌词
    for (const time of [20000, 130000, 280000]) {
      expect(dayu.lyrics!.some((c) => c.startMs <= time && c.endMs > time)).toBe(false);
    }
    expect(
      dayu.lyrics!.every((cue, i, cues) => cue.endMs > cue.startMs && (!i || cue.startMs >= cues[i - 1].endMs)),
    ).toBe(true);
    expect(dayu.lyrics!.at(-1)!.endMs).toBeLessThan(dayu.expectedDurationMs);
  });

  it("places every hit on the sixteenth grid inside its bar", () => {
    for (const bar of dayuBars) {
      const sixteenthMs = (bar.endMs - bar.startMs) / 16;
      for (const hit of bar.hits) {
        const slot = (hit.atMs - bar.startMs) / sixteenthMs;
        expect(Math.abs(slot - Math.round(slot))).toBeLessThan(0.01);
        expect(hit.atMs).toBeGreaterThanOrEqual(bar.startMs);
        expect(hit.atMs).toBeLessThan(bar.endMs);
      }
    }
  });
});
