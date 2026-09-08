// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readAudioDurationMs, type AudioProbeElement } from "./audioProbe";

function makeProbe(duration: number) {
  const listeners = new Map<string, EventListener>();
  const element: AudioProbeElement = {
    duration,
    preload: "none",
    src: "",
    addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
    removeEventListener: vi.fn((type) => listeners.delete(type)),
    load: vi.fn(() => listeners.get("loadedmetadata")?.(new Event("loadedmetadata"))),
  };
  return element;
}

describe("readAudioDurationMs", () => {
  it("reads finite metadata and always revokes the temporary object URL", async () => {
    const element = makeProbe(61.25);
    const revokeObjectURL = vi.fn();

    await expect(
      readAudioDurationMs(new File(["audio"], "song.mp3", { type: "audio/mpeg" }), {
        createAudio: () => element,
        createObjectURL: () => "blob:preview",
        revokeObjectURL,
      }),
    ).resolves.toBe(61_250);

    expect(element.src).toBe("blob:preview");
    expect(element.preload).toBe("metadata");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  it("rejects audio that Safari cannot decode", async () => {
    const listeners = new Map<string, EventListener>();
    const element: AudioProbeElement = {
      duration: Number.NaN,
      preload: "none",
      src: "",
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener: (type) => listeners.delete(type),
      load: () => listeners.get("error")?.(new Event("error")),
    };

    await expect(
      readAudioDurationMs(new File(["bad"], "song.mp3", { type: "audio/mpeg" }), {
        createAudio: () => element,
        createObjectURL: () => "blob:bad",
        revokeObjectURL: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: "invalid-audio" });
  });
});
