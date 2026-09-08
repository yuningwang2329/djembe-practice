import type { SongDefinition } from "../domain/song";

export function makeSong(): SongDefinition {
  return {
    id: "test-groove",
    title: "测试节奏",
    artist: "家庭练习",
    bpm: 120,
    timeSignature: [4, 4],
    audioOffsetMs: 0,
    expectedDurationMs: 8_000,
    bars: Array.from({ length: 8 }, (_, index) => {
      const startMs = index * 1_000;
      return {
        number: index + 1,
        startMs,
        endMs: startMs + 1_000,
        beats: 4,
        hits: [
          { atMs: startMs, stroke: "bass" as const, hand: "R" as const },
          { atMs: startMs + 500, stroke: "tone" as const, hand: "L" as const },
        ],
      };
    }),
  };
}
