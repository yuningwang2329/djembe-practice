import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class TestAudio extends EventTarget {
  currentTime = 0;
  muted = false;
  paused = true;
  playbackRate = 1;
  preload = "none";
  preservesPitch = true;
  src = "";
  volume = 1;

  constructor(src = "") {
    super();
    this.src = src;
  }

  load() {}

  pause() {
    this.paused = true;
  }

  async play() {
    this.paused = false;
  }

  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
}

Object.defineProperty(globalThis, "Audio", {
  configurable: true,
  value: TestAudio,
});

afterEach(() => {
  cleanup();
});
