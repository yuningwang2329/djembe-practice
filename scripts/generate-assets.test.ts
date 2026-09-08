// @vitest-environment node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDemoBackingEvents, generateAssets } from "./generate-assets.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("generateAssets", () => {
  it("uses a melodic backing pattern that is independent from the djembe score", () => {
    const events = createDemoBackingEvents();

    expect(events).toHaveLength(64);
    expect(events.slice(0, 4).map((event) => event.atSeconds)).toEqual([0, 0.5, 1, 1.5]);
    expect(events.every((event) => event.durationSeconds > 0.3)).toBe(true);
    expect(events.every((event) => !Object.hasOwn(event, "stroke"))).toBe(true);
  });

  it("creates install icons and a cacheable 32-second demo backing track", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "djembe-assets-"));
    temporaryDirectories.push(outputDirectory);

    await generateAssets(outputDirectory);

    const audio = await readFile(join(outputDirectory, "audio", "demo-groove.wav"));
    expect(audio.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(audio.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(audio.readUInt32LE(24)).toBe(22_050);
    expect(audio.length).toBeLessThan(2 * 1024 * 1024);
    expect(audio.readUInt32LE(40) / (22_050 * 2)).toBeCloseTo(32, 2);

    for (const icon of ["apple-touch-icon.png", "icon-192.png", "icon-512.png"]) {
      const iconBytes = await readFile(join(outputDirectory, "icons", icon));
      expect(iconBytes.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    }
  });
});
