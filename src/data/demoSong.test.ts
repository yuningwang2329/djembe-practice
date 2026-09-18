// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateSong } from "../domain/song";
import { demoSong, songLibrary } from "./demoSong";

describe("demoSong", () => {
  it("provides sixteen valid bars and a built-in backing track", () => {
    expect(validateSong(demoSong)).toEqual([]);
    expect(demoSong.bars).toHaveLength(16);
    expect(demoSong.builtInAudioUrl).toBe("audio/demo-groove.wav");
    expect(demoSong.expectedDurationMs).toBe(32_000);
  });

  it("contains all three strokes and both hands", () => {
    const hits = demoSong.bars.flatMap((bar) => bar.hits);
    expect(new Set(hits.map((hit) => hit.stroke))).toEqual(new Set(["bass", "tone", "slap"]));
    expect(new Set(hits.map((hit) => hit.hand))).toEqual(new Set(["R", "L"]));
  });

  it("exports all 11 songs in songLibrary and all pass validation", () => {
    expect(songLibrary.length).toBe(11);
    songLibrary.forEach((song) => {
      const errors = validateSong(song);
      expect(errors, `Song ${song.title} failed validation: ${errors.join(", ")}`).toEqual([]);
    });
  });
});

