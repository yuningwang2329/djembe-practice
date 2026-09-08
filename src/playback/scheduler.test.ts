// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createScheduleCursor } from "./scheduler";
import { makeSong } from "../test/fixtures";

describe("drum scheduler", () => {
  it("converts score-time hits in its look-ahead window into Web Audio times", () => {
    const cursor = createScheduleCursor(makeSong());

    const scheduled = cursor.schedule({
      scoreNowMs: 1_000,
      scoreUntilMs: 1_600,
      audioNowSeconds: 10,
      playbackRate: 1.25,
    });

    expect(scheduled).toEqual([
      expect.objectContaining({
        hit: { atMs: 1_000, stroke: "bass", hand: "R" },
        atAudioTimeSeconds: 10,
      }),
      expect.objectContaining({
        hit: { atMs: 1_500, stroke: "tone", hand: "L" },
        atAudioTimeSeconds: 10.4,
      }),
    ]);
  });

  it("deduplicates overlapping scheduling windows but allows events after a seek reset", () => {
    const cursor = createScheduleCursor(makeSong());
    const firstWindow = {
      scoreNowMs: 900,
      scoreUntilMs: 1_600,
      audioNowSeconds: 10,
      playbackRate: 1,
    };

    expect(cursor.schedule(firstWindow).map(({ hit }) => hit.atMs)).toEqual([1_000, 1_500]);
    expect(
      cursor.schedule({ ...firstWindow, scoreNowMs: 1_200, scoreUntilMs: 1_800 }),
    ).toEqual([]);

    cursor.reset(1_200);

    expect(
      cursor
        .schedule({ ...firstWindow, scoreNowMs: 1_200, scoreUntilMs: 1_800 })
        .map(({ hit }) => hit.atMs),
    ).toEqual([1_500]);
  });
});
