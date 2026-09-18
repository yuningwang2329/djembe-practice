import type { Hand, SongDefinition, Stroke } from "../domain/song";

const barDurationMs = 2_000;
const subdivisionMs = 250;

const patterns: Array<Array<Stroke | null>> = [
  ["bass", null, "tone", "tone", "bass", null, "slap", "tone"],
  ["bass", "tone", null, "slap", "bass", "tone", "slap", null],
  ["bass", null, "slap", "tone", "bass", "tone", null, "slap"],
  ["bass", "tone", "tone", null, "slap", null, "tone", "slap"],
];

function handFor(subdivision: number, barIndex: number): Hand {
  return (subdivision + barIndex) % 2 === 0 ? "R" : "L";
}

export const demoSong: SongDefinition = {
  id: "warm-up-groove",
  title: "暖身律动",
  artist: "鼓点练习",
  bpm: 120,
  timeSignature: [4, 4],
  audioOffsetMs: 0,
  expectedDurationMs: 32_000,
  builtInAudioUrl: "audio/demo-groove.wav",
  bars: Array.from({ length: 16 }, (_, barIndex) => {
    const startMs = barIndex * barDurationMs;
    const pattern = patterns[barIndex % patterns.length];
    return {
      number: barIndex + 1,
      startMs,
      endMs: startMs + barDurationMs,
      beats: 4,
      hits: pattern.flatMap((stroke, subdivision) =>
        stroke
          ? [
              {
                atMs: startMs + subdivision * subdivisionMs,
                stroke,
                hand: handFor(subdivision, barIndex),
              },
            ]
          : [],
      ),
    };
  }),
};

import { qiaobianguniang } from "./qiaobianguniang";
import { gulou } from "./gulou";
import { dayu } from "./dayu";

export const songLibrary: SongDefinition[] = [demoSong, qiaobianguniang, gulou, dayu];
