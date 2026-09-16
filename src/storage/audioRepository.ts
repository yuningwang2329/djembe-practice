import { openDB, type DBSchema } from "idb";

export interface StoredAudio {
  songId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  durationMs: number;
  updatedAt: number;
}

export type AudioMetadata = Omit<StoredAudio, "blob">;

export interface SaveAudioOptions {
  expectedDurationMs: number;
  allowDurationMismatch?: boolean;
}

export interface StorageEstimate {
  usage?: number;
  quota?: number;
}

interface AudioDatabase extends DBSchema {
  audio: {
    key: string;
    value: StoredAudio;
  };
}

export class AudioImportError extends Error {
  constructor(
    public readonly code: "unsupported-format" | "duration-mismatch" | "invalid-audio",
    message: string,
  ) {
    super(message);
    this.name = "AudioImportError";
  }
}

const supportedMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/x-aac",
  "audio/flac",
  "audio/x-flac",
]);
const supportedExtensions = new Set(["mp3", "m4a", "aac", "flac"]);

export function isSupportedAudioFile(file: Pick<File, "name" | "type">): boolean {
  if (supportedMimeTypes.has(file.type.toLowerCase())) return true;
  if (file.type) return false;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return supportedExtensions.has(extension);
}

function durationTolerance(expectedDurationMs: number): number {
  return Math.max(5_000, expectedDurationMs * 0.03);
}

export function canFitAudio(
  fileSize: number,
  estimate: StorageEstimate,
  reserveBytes = 10_000_000,
): boolean {
  if (estimate.usage === undefined || estimate.quota === undefined) return true;
  return estimate.quota - estimate.usage >= fileSize + reserveBytes;
}

export function createAudioRepository(databaseName = "djembe-practice") {
  async function withDatabase<T>(operation: (database: Awaited<ReturnType<typeof open>>) => Promise<T>) {
    const database = await open();
    try {
      return await operation(database);
    } finally {
      database.close();
    }
  }

  function open() {
    return openDB<AudioDatabase>(databaseName, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("audio")) {
          database.createObjectStore("audio", { keyPath: "songId" });
        }
      },
    });
  }

  return {
    async save(record: StoredAudio, options: SaveAudioOptions): Promise<void> {
      if (
        !record.songId ||
        !record.fileName ||
        record.size < 0 ||
        record.durationMs <= 0 ||
        record.blob.size !== record.size
      ) {
        throw new AudioImportError("invalid-audio", "歌曲文件信息不完整");
      }
      if (!isSupportedAudioFile({ name: record.fileName, type: record.mimeType } as File)) {
        throw new AudioImportError(
          "unsupported-format",
          "请选择 MP3、M4A、AAC 或 FLAC 歌曲文件",
        );
      }
      const difference = Math.abs(record.durationMs - options.expectedDurationMs);
      if (
        difference > durationTolerance(options.expectedDurationMs) &&
        !options.allowDurationMismatch
      ) {
        throw new AudioImportError(
          "duration-mismatch",
          "这份音频的时长与鼓谱不一致，需要确认后再导入",
        );
      }
      await withDatabase(async (database) => {
        await database.put("audio", record);
      });
    },

    get(songId: string): Promise<StoredAudio | undefined> {
      return withDatabase((database) => database.get("audio", songId));
    },

    remove(songId: string): Promise<void> {
      return withDatabase(async (database) => {
        await database.delete("audio", songId);
      });
    },

    listMetadata(): Promise<AudioMetadata[]> {
      return withDatabase(async (database) => {
        const records = await database.getAll("audio");
        return records.map(({ blob: _blob, ...metadata }) => metadata);
      });
    },
  };
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return {};
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return {};
  }
}
