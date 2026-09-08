import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "./useWakeLock";

class WakeLockSentinelMock extends EventTarget {
  released = false;

  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  });
}

function setWakeLock(request: ReturnType<typeof vi.fn> | undefined) {
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: request ? { request } : undefined,
  });
}

afterEach(() => {
  setWakeLock(undefined);
});

describe("useWakeLock", () => {
  it("requests a screen lock while playback is active and releases it when playback stops", async () => {
    const sentinel = new WakeLockSentinelMock();
    const request = vi.fn().mockResolvedValue(sentinel);
    setWakeLock(request);

    const { result, rerender } = renderHook(({ playing }) => useWakeLock(playing), {
      initialProps: { playing: true },
    });

    await waitFor(() => expect(result.current.active).toBe(true));
    expect(request).toHaveBeenCalledWith("screen");

    rerender({ playing: false });

    await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce());
    expect(result.current.active).toBe(false);
  });

  it("does not request a lock when the browser does not support it", () => {
    setWakeLock(undefined);

    const { result } = renderHook(() => useWakeLock(true));

    expect(result.current.supported).toBe(false);
    expect(result.current.active).toBe(false);
  });

  it("reacquires the screen lock when the page becomes visible again", async () => {
    const first = new WakeLockSentinelMock();
    const second = new WakeLockSentinelMock();
    const request = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    setWakeLock(request);

    const { result } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(result.current.active).toBe(true));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await waitFor(() => expect(first.release).toHaveBeenCalledOnce());

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    await waitFor(() => {
      expect(request).toHaveBeenCalledTimes(2);
      expect(result.current.active).toBe(true);
    });
  });
});
