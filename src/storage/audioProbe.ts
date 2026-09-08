import { AudioImportError } from "./audioRepository";

export interface AudioProbeElement {
  duration: number;
  preload: string;
  src: string;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  load: () => void;
}

export interface AudioProbeRuntime {
  createAudio: () => AudioProbeElement;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

const browserRuntime: AudioProbeRuntime = {
  createAudio: () => new Audio() as unknown as AudioProbeElement,
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
};

export function readAudioDurationMs(
  file: File,
  runtime: AudioProbeRuntime = browserRuntime,
): Promise<number> {
  const objectUrl = runtime.createObjectURL(file);
  const audio = runtime.createAudio();
  audio.preload = "metadata";
  audio.src = objectUrl;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", handleMetadata);
      audio.removeEventListener("error", handleError);
      runtime.revokeObjectURL(objectUrl);
    };
    const fail = () => {
      cleanup();
      reject(new AudioImportError("invalid-audio", "Safari 无法读取这份音频，请换用 MP3、M4A 或 AAC 文件"));
    };
    const handleMetadata: EventListener = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        fail();
        return;
      }
      const durationMs = Math.round(audio.duration * 1_000);
      cleanup();
      resolve(durationMs);
    };
    const handleError: EventListener = () => fail();

    audio.addEventListener("loadedmetadata", handleMetadata);
    audio.addEventListener("error", handleError);
    audio.load();
  });
}
