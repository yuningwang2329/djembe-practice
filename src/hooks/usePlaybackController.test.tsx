import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePlaybackController } from "./usePlaybackController";
import { makeSong } from "../test/fixtures";

describe("usePlaybackController", () => {
  it("exposes a performance-clock practice session when no original file is available", async () => {
    const song = makeSong();
    const noAnimationFrame = () => undefined;
    const { result } = renderHook(() =>
      usePlaybackController(song, undefined, { requestFrame: noAnimationFrame }),
    );

    await act(async () => {
      await result.current.play({ countInBeats: 0 });
    });
    expect(result.current.snapshot.isPlaying).toBe(true);

    act(() => {
      result.current.setRate(1.26);
      result.current.setTrackMuted("drums", true);
      result.current.setLoop({ startMs: 1_000, endMs: 2_000 });
      result.current.seek(1_250);
    });

    expect(result.current.snapshot.playbackRate).toBe(1.25);
    expect(result.current.snapshot.drumMuted).toBe(true);
    expect(result.current.snapshot.loop).toEqual({ startMs: 1_000, endMs: 2_000 });
    expect(result.current.snapshot.currentTimeMs).toBeGreaterThanOrEqual(1_250);
  });
});
