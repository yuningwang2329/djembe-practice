import { describe, expect, it } from "vitest";
import { validateSong } from "../domain/song";
import { qiaobianguniang } from "./qiaobianguniang";

describe("qiaobianguniang", () => {
  it("passes song validation", () => {
    expect(validateSong(qiaobianguniang)).toEqual([]);
  });

  it("keeps both variants aligned with the same bar frame", () => {
    const variants = qiaobianguniang.variants ?? [];
    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      expect(variant.bars).toHaveLength(qiaobianguniang.bars.length);
      expect(validateSong({ ...qiaobianguniang, bars: variant.bars })).toEqual([]);
    }
  });

  it("places hits on the eighth-note grid inside their bars", () => {
    for (const bar of qiaobianguniang.bars) {
      const eighthMs = (bar.endMs - bar.startMs) / 8;
      for (const hit of bar.hits) {
        const slot = (hit.atMs - bar.startMs) / eighthMs;
        expect(Math.abs(slot - Math.round(slot))).toBeLessThan(0.01);
        expect(hit.atMs).toBeGreaterThanOrEqual(bar.startMs);
        expect(hit.atMs).toBeLessThan(bar.endMs);
      }
    }
  });

  it("alternates hands within every bar", () => {
    for (const bar of qiaobianguniang.bars) {
      bar.hits.forEach((hit, index) => {
        expect(hit.hand).toBe(index % 2 === 0 ? "R" : "L");
      });
    }
  });

  it("covers the measured audio duration without overflowing", () => {
    const lastBar = qiaobianguniang.bars.at(-1);
    expect(lastBar).toBeDefined();
    expect(lastBar!.endMs).toBeLessThanOrEqual(qiaobianguniang.expectedDurationMs);
    // 谱面结尾与音频结尾相距不超过一个小节
    expect(qiaobianguniang.expectedDurationMs - lastBar!.endMs).toBeLessThan(4000);
  });
});
