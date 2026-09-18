import { describe, expect, it } from "vitest";
import { validateSong } from "../domain/song";
import { tongnianSong } from "./tongnian";
import { shuishouSong } from "./shuishou";
import { lasaSong } from "./lasa";
import { pingguoxiang } from "./pingguoxiang";
import { sarilang } from "./sarilang";
import { beijing } from "./beijing";
import { chouchangke } from "./chouchangke";

describe("New songs validation", () => {
  it("validates tongnian song data without errors", () => {
    const errors = validateSong(tongnianSong);
    expect(errors).toEqual([]);
    expect(tongnianSong.bars.length).toBeGreaterThan(50);
    expect(tongnianSong.rhythmPatterns?.length).toBeGreaterThan(2);
  });

  it("validates shuishou song data without errors", () => {
    const errors = validateSong(shuishouSong);
    expect(errors).toEqual([]);
    expect(shuishouSong.bars.length).toBeGreaterThan(50);
    expect(shuishouSong.rhythmPatterns?.length).toBeGreaterThan(2);
  });

  it("validates lasa song data without errors", () => {
    const errors = validateSong(lasaSong);
    expect(errors).toEqual([]);
    expect(lasaSong.bars.length).toBeGreaterThan(50);
    expect(lasaSong.rhythmPatterns?.length).toBeGreaterThan(2);
  });

  it("validates pingguoxiang song data without errors", () => {
    const errors = validateSong(pingguoxiang);
    expect(errors).toEqual([]);
    expect(pingguoxiang.bars.length).toBeGreaterThan(50);
    expect(pingguoxiang.rhythmPatterns?.length).toBeGreaterThan(2);
    // Check that lyricBeats exist on vocal bars
    const vocalBars = pingguoxiang.bars.filter((b) => b.lyric);
    expect(vocalBars.length).toBeGreaterThan(20);
    vocalBars.forEach((b) => {
      expect(b.lyricBeats).toBeDefined();
      expect(b.lyricBeats?.length).toBe(b.beats);
    });
  });

  it("validates sarilang song data without errors", () => {
    const errors = validateSong(sarilang);
    expect(errors).toEqual([]);
    expect(sarilang.bars.length).toBeGreaterThan(50);
    expect(sarilang.rhythmPatterns?.length).toBeGreaterThan(2);
    const vocalBars = sarilang.bars.filter((b) => b.lyric);
    expect(vocalBars.length).toBeGreaterThan(20);
    vocalBars.forEach((b) => {
      expect(b.lyricBeats).toBeDefined();
      expect(b.lyricBeats?.length).toBe(b.beats);
    });
  });

  it("validates beijing song data without errors", () => {
    const errors = validateSong(beijing);
    expect(errors).toEqual([]);
    expect(beijing.bars.length).toBeGreaterThan(50);
    expect(beijing.rhythmPatterns?.length).toBeGreaterThan(2);
    const vocalBars = beijing.bars.filter((b) => b.lyric);
    expect(vocalBars.length).toBeGreaterThan(20);
    vocalBars.forEach((b) => {
      expect(b.lyricBeats).toBeDefined();
      expect(b.lyricBeats?.length).toBe(b.beats);
    });
  });

  it("validates chouchangke song data without errors", () => {
    const errors = validateSong(chouchangke);
    expect(errors).toEqual([]);
    expect(chouchangke.bars.length).toBeGreaterThan(50);
    expect(chouchangke.rhythmPatterns?.length).toBeGreaterThan(2);
    const vocalBars = chouchangke.bars.filter((b) => b.lyric);
    expect(vocalBars.length).toBeGreaterThan(20);
    vocalBars.forEach((b) => {
      expect(b.lyricBeats).toBeDefined();
      expect(b.lyricBeats?.length).toBe(b.beats);
    });
  });
});
