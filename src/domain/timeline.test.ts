// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  clampPlaybackRate,
  getBarAtTime,
  getBarPage,
  getHitState,
  getLoopSeekTarget,
} from "./timeline";
import { makeSong } from "../test/fixtures";

describe("timeline derivations", () => {
  it("finds the bar at a media time and clamps past the score", () => {
    const song = makeSong();
    expect(getBarAtTime(song, 2_400)?.number).toBe(3);
    expect(getBarAtTime(song, -50)?.number).toBe(1);
    expect(getBarAtTime(song, 99_000)?.number).toBe(8);
  });

  it("returns the four-bar page containing the active bar", () => {
    const song = makeSong();
    expect(getBarPage(song, 1).map((bar) => bar.number)).toEqual([1, 2, 3, 4]);
    expect(getBarPage(song, 6).map((bar) => bar.number)).toEqual([5, 6, 7, 8]);
  });

  it("marks a hit briefly and exposes the next hit", () => {
    const song = makeSong();
    const state = getHitState(song, 1_040, 120);
    expect(state.current?.atMs).toBe(1_000);
    expect(state.next?.atMs).toBe(1_500);

    expect(getHitState(song, 1_300, 120).current).toBeNull();
  });

  it("clamps and rounds speed to five hundredths", () => {
    expect(clampPlaybackRate(0.2)).toBe(0.5);
    expect(clampPlaybackRate(1.274)).toBe(1.25);
    expect(clampPlaybackRate(1.276)).toBe(1.3);
    expect(clampPlaybackRate(2)).toBe(1.5);
  });

  it("seeks to the loop start only at or beyond the loop end", () => {
    expect(getLoopSeekTarget(3_999, 1_000, 4_000)).toBeNull();
    expect(getLoopSeekTarget(4_000, 1_000, 4_000)).toBe(1_000);
  });
});
