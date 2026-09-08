// @vitest-environment node

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cacheVersionForFiles, stampServiceWorker } from "./stamp-service-worker";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("stampServiceWorker", () => {
  it("changes the cache name whenever the built HTML changes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "djembe-sw-"));
    temporaryDirectories.push(directory);
    const indexPath = join(directory, "index.html");
    const serviceWorkerPath = join(directory, "sw.js");
    await writeFile(indexPath, '<script src="app-one.js"></script>');
    await writeFile(serviceWorkerPath, 'const cache = "__CACHE_VERSION__";');

    const version = await stampServiceWorker(indexPath, serviceWorkerPath);

    expect(version).toMatch(/^[a-f0-9]{12}$/);
    expect(await readFile(serviceWorkerPath, "utf8")).toBe(`const cache = "${version}";`);
  });

  it("changes the version when a stable-name offline asset changes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "djembe-sw-assets-"));
    temporaryDirectories.push(directory);
    const indexPath = join(directory, "index.html");
    const audioPath = join(directory, "demo.wav");
    await writeFile(indexPath, "same html");
    await writeFile(audioPath, "first audio");
    const firstVersion = await cacheVersionForFiles([indexPath, audioPath]);

    await writeFile(audioPath, "second audio");

    await expect(cacheVersionForFiles([indexPath, audioPath])).resolves.not.toBe(firstVersion);
  });
});
