// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  AudioImportError,
  canFitAudio,
  createAudioRepository,
  isSupportedAudioFile,
  type StoredAudio,
} from "./audioRepository";

const databaseNames: string[] = [];

function makeRecord(overrides: Partial<StoredAudio> = {}): StoredAudio {
  const blob = new Blob(["audio-bytes"], { type: "audio/mpeg" });
  return {
    songId: "song-1",
    blob,
    fileName: "song.mp3",
    mimeType: "audio/mpeg",
    size: blob.size,
    durationMs: 60_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

function makeRepository() {
  const dbName = `djembe-test-${crypto.randomUUID()}`;
  databaseNames.push(dbName);
  return createAudioRepository(dbName);
}

afterEach(async () => {
  await Promise.all(
    databaseNames.splice(0).map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        }),
    ),
  );
});

describe("audio repository", () => {
  it("saves, reads and lists metadata without returning blobs", async () => {
    const repository = makeRepository();
    await repository.save(makeRecord(), { expectedDurationMs: 60_000 });

    const stored = await repository.get("song-1");
    // fake-indexeddb cannot preserve JSDOM Blob accessors. Browser E2E covers byte playback.
    expect(stored?.blob).toBeDefined();
    expect(await repository.listMetadata()).toEqual([
      expect.objectContaining({ songId: "song-1", fileName: "song.mp3", size: 11 }),
    ]);
    expect(await repository.listMetadata()).not.toEqual([
      expect.objectContaining({ blob: expect.anything() }),
    ]);
  });

  it("replaces a song atomically and deletes it", async () => {
    const repository = makeRepository();
    await repository.save(makeRecord(), { expectedDurationMs: 60_000 });
    await repository.save(
      makeRecord({
        blob: new Blob(["new"], { type: "audio/mp4" }),
        fileName: "song.m4a",
        mimeType: "audio/mp4",
        size: 3,
        updatedAt: 1_800_000_000_000,
      }),
      { expectedDurationMs: 60_000 },
    );

    expect((await repository.get("song-1"))?.fileName).toBe("song.m4a");
    await repository.remove("song-1");
    expect(await repository.get("song-1")).toBeUndefined();
  });

  it("rejects unsupported input without overwriting existing audio", async () => {
    const repository = makeRepository();
    await repository.save(makeRecord(), { expectedDurationMs: 60_000 });

    await expect(
      repository.save(
        makeRecord({ fileName: "notes.txt", mimeType: "text/plain" }),
        { expectedDurationMs: 60_000 },
      ),
    ).rejects.toBeInstanceOf(AudioImportError);
    expect((await repository.get("song-1"))?.fileName).toBe("song.mp3");
  });

  it("requires confirmation when duration differs too much", async () => {
    const repository = makeRepository();
    const shortFile = makeRecord({ durationMs: 40_000 });

    await expect(
      repository.save(shortFile, { expectedDurationMs: 60_000 }),
    ).rejects.toMatchObject({ code: "duration-mismatch" });

    await repository.save(shortFile, {
      expectedDurationMs: 60_000,
      allowDurationMismatch: true,
    });
    expect(await repository.get("song-1")).toBeDefined();
  });
});

describe("audio import validation", () => {
  it("accepts common iPad audio MIME types or known file extensions", () => {
    expect(isSupportedAudioFile({ name: "track.mp3", type: "audio/mpeg" })).toBe(true);
    expect(isSupportedAudioFile({ name: "track.m4a", type: "audio/x-m4a" })).toBe(true);
    expect(isSupportedAudioFile({ name: "track.aac", type: "" })).toBe(true);
    expect(isSupportedAudioFile({ name: "track.wav", type: "audio/wav" })).toBe(false);
  });

  it("reserves ten megabytes when checking quota", () => {
    expect(canFitAudio(5_000_000, { usage: 10_000_000, quota: 30_000_000 })).toBe(true);
    expect(canFitAudio(15_000_001, { usage: 10_000_000, quota: 30_000_000 })).toBe(false);
    expect(canFitAudio(1, {})).toBe(true);
  });
});
