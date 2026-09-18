import { describe, expect, it } from "vitest";
import { gulou } from "./gulou";
import { validateSong } from "../domain/song";
import { songLibrary } from "./demoSong";

describe("鼓楼 / 用户提供录音与马丁教学谱", () => {
  it("registers 128 bars with the printed repeats and leaves the unscored lead-in intact", () => {
    expect(songLibrary).toContain(gulou);
    expect(validateSong(gulou)).toEqual([]);
    expect(gulou.bars).toHaveLength(128);
    expect(gulou.bars[0].startMs).toBe(10610);
    expect(gulou.bars.at(-1)!.endMs).toBeLessThan(gulou.expectedDurationMs);
    expect(gulou.bars.filter(b => b.section).map(b => b.number)).toEqual([1, 9, 25, 41, 49, 65, 81, 113, 121]);
    expect(gulou.bars.slice(65, 80).every(b => b.hits.length === 0)).toBe(true);
    expect(gulou.bars.slice(112, 120).every(b => b.hits.length === 0)).toBe(true);
  });
  it("matches independently measured bass transients across the recording, not just its opening", () => {
    for (const [number, measured] of [[1,10609],[9,26882],[25,59423],[41,91964],[49,108237],[65,140778],[81,173319],[105,222133],[121,254679],[128,268917]]) {
      expect(Math.abs(gulou.bars[number - 1].startMs - measured)).toBeLessThan(20);
    }
  });
  it("preserves soft s and b separately from hands and includes every sixteenth in fills", () => {
    const chorus = gulou.bars[24].hits;
    expect(chorus).toHaveLength(11);
    expect(chorus.filter(h => h.dynamics === "soft")).toHaveLength(6);
    expect(gulou.bars[31].hits).toHaveLength(13);
    const fill = gulou.bars[6];
    expect(fill.hits).toHaveLength(9);
    expect(fill.hits[5].atMs - fill.hits[4].atMs).toBeCloseTo(127, 0);
    expect(gulou.bars[127].hits.at(-1)).toMatchObject({ stroke: "bass", dynamics: "soft", hand: "L" });
  });
  it("keeps all 24 supplied lyric cues and clears them through instrumental gaps", () => {
    expect(gulou.lyrics).toHaveLength(24);
    for (const time of [95000, 150000, 245000]) expect(gulou.lyrics!.some(c => c.startMs <= time && c.endMs > time)).toBe(false);
    expect(gulou.lyrics!.every((cue, i, cues) => cue.endMs > cue.startMs && (!i || cue.startMs >= cues[i - 1].endMs))).toBe(true);
  });
});
