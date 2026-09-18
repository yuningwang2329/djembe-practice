import { describe, expect, it } from "vitest";
import { validateSong } from "../domain/song";
import { tongnianSong } from "./tongnian";
import { shuishouSong } from "./shuishou";
import { lasaSong } from "./lasa";

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
});
