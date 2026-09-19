// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createScheduleCursor } from "./scheduler";
import { makeSong } from "../test/fixtures";

describe("drum scheduler", () => {
  it('catches a just-missed frame once but never replays a hit before the explicit seek point',()=>{
    const cursor=createScheduleCursor(makeSong());
    cursor.reset(1000);
    const window={scoreNowMs:1012,scoreUntilMs:1100,audioNowSeconds:10,playbackRate:1};
    expect(cursor.schedule(window).map(e=>[e.hit.atMs,e.atAudioTimeSeconds])).toEqual([[1000,10]]);
    expect(cursor.schedule(window)).toEqual([]);
    cursor.reset(1001);
    expect(cursor.schedule(window)).toEqual([]);
    cursor.reset(1000);
    expect(cursor.schedule({...window,scoreNowMs:1200,scoreUntilMs:1300})).toEqual([]);
  });
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
