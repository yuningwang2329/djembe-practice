import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { SongDefinition } from "../domain/song";
import { requestPersistentStorage } from "../pwa";
import {
  AudioImportError,
  canFitAudio,
  createAudioRepository,
  getStorageEstimate,
  isSupportedAudioFile,
  type AudioMetadata,
  type SaveAudioOptions,
  type StorageEstimate,
  type StoredAudio,
} from "../storage/audioRepository";
import { readAudioDurationMs } from "../storage/audioProbe";

export interface AudioRepositoryApi {
  get: (songId: string) => Promise<StoredAudio | undefined>;
  listMetadata: () => Promise<AudioMetadata[]>;
  remove: (songId: string) => Promise<void>;
  save: (record: StoredAudio, options: SaveAudioOptions) => Promise<void>;
}

export interface AudioSourceServices {
  repository: AudioRepositoryApi;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  getStorageEstimate: () => Promise<StorageEstimate>;
  readAudioDurationMs: (file: File) => Promise<number>;
  requestPersistentStorage: () => Promise<boolean>;
  now: () => number;
  fingerprint?: (blob: Blob) => Promise<string | undefined>;
}

const defaultServices: AudioSourceServices = {
  repository: createAudioRepository(),
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  getStorageEstimate,
  readAudioDurationMs,
  requestPersistentStorage,
  now: () => Date.now(),
  fingerprint: async blob => {
    if (!globalThis.crypto?.subtle) return undefined;
    try {
      const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
      return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
    } catch { return undefined; }
  },
};

function formatMegabytes(bytes: number | undefined): string | null {
  if (bytes === undefined) return null;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function importMessage(error: unknown): string {
  if (error instanceof AudioImportError) return error.message;
  return "音频保存失败，请检查 iPad 剩余空间后重试";
}

interface AudioSourceManagerProps {
  song: SongDefinition;
  onAudioUrlChange: (audioUrl: string | undefined) => void;
  services?: AudioSourceServices;
}

export function AudioSourceManager({
  song,
  onAudioUrlChange,
  services = defaultServices,
}: AudioSourceManagerProps) {
  const [status, setStatus] = useState("正在检查本机音频…");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingMismatch, setPendingMismatch] = useState<StoredAudio | null>(null);
  const [estimate, setEstimate] = useState<StorageEstimate>({});
  const [hasLocalAudio, setHasLocalAudio] = useState(false);
  const [versionWarning,setVersionWarning]=useState(false);
  const localUrlRef = useRef<string | null>(null);

  const useAudioBlob = (blob: Blob) => {
    if (localUrlRef.current) services.revokeObjectURL(localUrlRef.current);
    const localUrl = services.createObjectURL(blob);
    localUrlRef.current = localUrl;
    onAudioUrlChange(localUrl);
  };

  useEffect(() => {
    let cancelled = false;
    void services.getStorageEstimate().then((nextEstimate) => {
      if (!cancelled) setEstimate(nextEstimate);
    });
    void services.repository.get(song.id).then(
      (record) => {
        if (cancelled) return;
        if (record) {
          useAudioBlob(record.blob);
          setHasLocalAudio(true);
          setStatus("已保存到此 iPad · 离线可用");
          if (song.recordingSha256) {
            void (record.sha256 ? Promise.resolve(record.sha256) : services.fingerprint?.(record.blob) ?? Promise.resolve(undefined))
              .then(hash=>{if(!cancelled)setVersionWarning(Boolean(hash && hash!==song.recordingSha256));});
          }
          return;
        }
        onAudioUrlChange(song.builtInAudioUrl);
        setStatus(song.builtInAudioUrl ? "内置伴奏 · 离线可用" : "未导入原歌曲");
      },
      () => {
        if (cancelled) return;
        onAudioUrlChange(song.builtInAudioUrl);
        setStatus(song.builtInAudioUrl ? "内置伴奏 · 离线可用" : "需要重新导入");
        setError("无法读取之前保存的音频，请重新导入");
      },
    );

    return () => {
      cancelled = true;
      if (localUrlRef.current) {
        services.revokeObjectURL(localUrlRef.current);
        localUrlRef.current = null;
      }
    };
  }, [onAudioUrlChange, services, song.builtInAudioUrl, song.id, song.recordingSha256]);

  const finishSave = async (record: StoredAudio, allowDurationMismatch: boolean) => {
    await services.repository.save(record, {
      expectedDurationMs: song.expectedDurationMs,
      allowDurationMismatch,
    });
    useAudioBlob(record.blob);
    setHasLocalAudio(true);
    setPendingMismatch(null);
    setError(null);
    setStatus("已保存到此 iPad · 离线可用");
    setVersionWarning(Boolean(record.sha256 && song.recordingSha256 && record.sha256!==song.recordingSha256));
    await services.requestPersistentStorage();
    setEstimate(await services.getStorageEstimate());
  };

  const importFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setPendingMismatch(null);
    try {
      if (!isSupportedAudioFile(file)) {
        throw new AudioImportError("unsupported-format", "请选择 MP3、M4A、AAC 或 FLAC 歌曲文件");
      }
      const nextEstimate = await services.getStorageEstimate();
      setEstimate(nextEstimate);
      if (!canFitAudio(file.size, nextEstimate)) {
        setError("iPad 本机空间不足，请先删除一些文件或本地歌曲音频");
        return;
      }
      const durationMs = await services.readAudioDurationMs(file);
      const record: StoredAudio = {
        songId: song.id,
        blob: file,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        durationMs,
        updatedAt: services.now(),
        sha256: song.recordingSha256 ? await services.fingerprint?.(file) : undefined,
      };
      try {
        await finishSave(record, false);
      } catch (reason) {
        if (reason instanceof AudioImportError && reason.code === "duration-mismatch") {
          setPendingMismatch(record);
          setError("音频时长与鼓谱不一致。确认歌曲版本正确后，可以仍然保存。");
          return;
        }
        throw reason;
      }
    } catch (reason) {
      setError(importMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const confirmMismatch = async () => {
    if (!pendingMismatch) return;
    setBusy(true);
    try {
      await finishSave(pendingMismatch, true);
    } catch (reason) {
      setError(importMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const removeLocalAudio = async () => {
    setBusy(true);
    setError(null);
    try {
      await services.repository.remove(song.id);
      if (localUrlRef.current) {
        services.revokeObjectURL(localUrlRef.current);
        localUrlRef.current = null;
      }
      setHasLocalAudio(false);
      setVersionWarning(false);
      onAudioUrlChange(song.builtInAudioUrl);
      setStatus(song.builtInAudioUrl ? "内置伴奏 · 离线可用" : "未导入原歌曲");
      setEstimate(await services.getStorageEstimate());
    } catch {
      setError("无法删除本地音频，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void importFile(file);
  };

  const usage = formatMegabytes(estimate.usage);
  const quota = formatMegabytes(estimate.quota);

  return (
    <section className="audio-source" aria-label="原歌曲本地音频">
      <div>
        <strong>{status}</strong>
        <small>{usage && quota ? `本应用已用约 ${usage} / 可用配额 ${quota}` : "歌曲只保存在这台 iPad"}</small>
      </div>
      <label className="audio-import-button">
        {busy ? "处理中…" : hasLocalAudio ? "更换音频" : "导入原歌曲"}
        <input
          aria-label="导入原歌曲"
          type="file"
          accept="audio/mpeg,audio/mp4,audio/aac,audio/flac,.mp3,.m4a,.aac,.flac"
          disabled={busy}
          onChange={handleFileChange}
        />
      </label>
      {hasLocalAudio && (
        <button type="button" className="audio-remove-button" disabled={busy} onClick={() => void removeLocalAudio()}>
          删除本地音频
        </button>
      )}
      {pendingMismatch && (
        <button type="button" className="audio-confirm-button" disabled={busy} onClick={() => void confirmMismatch()}>
          仍然保存这份音频
        </button>
      )}
      {error && <p className="audio-source__error" role="alert">{error}</p>}
      {versionWarning && <p className="audio-source__error" role="status">这份音频与校准用的原文件不同（转码也会改变指纹），可能影响同步。请优先导入当时提供的原版 MP3；现有音频仍可播放。</p>}
    </section>
  );
}
