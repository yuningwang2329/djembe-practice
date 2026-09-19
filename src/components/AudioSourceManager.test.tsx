import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { demoSong } from "../data/demoSong";
import type { StoredAudio } from "../storage/audioRepository";
import { AudioImportError } from "../storage/audioRepository";
import { AudioSourceManager, type AudioSourceServices } from "./AudioSourceManager";

function makeServices(overrides: Partial<AudioSourceServices> = {}): AudioSourceServices {
  return {
    repository: {
      get: vi.fn().mockResolvedValue(undefined),
      listMetadata: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    },
    createObjectURL: vi.fn(() => "blob:local-song"),
    revokeObjectURL: vi.fn(),
    getStorageEstimate: vi.fn().mockResolvedValue({ usage: 2_000, quota: 100_000_000 }),
    readAudioDurationMs: vi.fn().mockResolvedValue(demoSong.expectedDurationMs),
    requestPersistentStorage: vi.fn().mockResolvedValue(true),
    now: () => 1_700_000_000_000,
    ...overrides,
  };
}

describe("AudioSourceManager", () => {
  it('warns about a different recording even if its duration matches, without deleting the audio', async () => {
    const user=userEvent.setup();
    const services=makeServices({fingerprint:vi.fn().mockResolvedValue('different-hash')});
    render(<AudioSourceManager song={{...demoSong,recordingSha256:'reference-hash'}} onAudioUrlChange={vi.fn()} services={services}/>);
    await user.upload(screen.getByLabelText('导入原歌曲'),new File(['audio'],'other.mp3',{type:'audio/mpeg'}));
    expect(await screen.findByText(/与校准用的原文件不同/)).toBeInTheDocument();
    expect(services.repository.save).toHaveBeenCalledOnce();
    expect(services.repository.remove).not.toHaveBeenCalled();
  });
  it("uses the built-in demo when no imported audio exists", async () => {
    const onAudioUrlChange = vi.fn();
    render(<AudioSourceManager song={demoSong} onAudioUrlChange={onAudioUrlChange} services={makeServices()} />);

    expect(await screen.findByText("内置伴奏 · 离线可用")).toBeInTheDocument();
    expect(onAudioUrlChange).toHaveBeenCalledWith(demoSong.builtInAudioUrl);
  });

  it("imports a supported file, saves it locally and switches playback to it", async () => {
    const user = userEvent.setup();
    const services = makeServices();
    const onAudioUrlChange = vi.fn();
    render(<AudioSourceManager song={demoSong} onAudioUrlChange={onAudioUrlChange} services={services} />);

    const file = new File(["audio-bytes"], "family-song.mp3", { type: "audio/mpeg" });
    await user.upload(screen.getByLabelText("导入原歌曲"), file);

    expect(await screen.findByText("已保存到此 iPad · 离线可用")).toBeInTheDocument();
    expect(services.repository.save).toHaveBeenCalledWith(
      expect.objectContaining<Partial<StoredAudio>>({ songId: demoSong.id, fileName: file.name }),
      { expectedDurationMs: demoSong.expectedDurationMs, allowDurationMismatch: false },
    );
    expect(services.requestPersistentStorage).toHaveBeenCalledOnce();
    expect(onAudioUrlChange).toHaveBeenLastCalledWith("blob:local-song");
  });

  it("asks before saving an audio file whose duration differs from the score", async () => {
    const user = userEvent.setup();
    const services = makeServices({
      repository: {
        get: vi.fn().mockResolvedValue(undefined),
        listMetadata: vi.fn().mockResolvedValue([]),
        remove: vi.fn().mockResolvedValue(undefined),
        save: vi
          .fn()
          .mockRejectedValueOnce(new AudioImportError("duration-mismatch", "时长不同"))
          .mockResolvedValueOnce(undefined),
      },
    });
    render(<AudioSourceManager song={demoSong} onAudioUrlChange={vi.fn()} services={services} />);

    await user.upload(
      screen.getByLabelText("导入原歌曲"),
      new File(["audio"], "different.m4a", { type: "audio/mp4" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("时长");
    await user.click(screen.getByRole("button", { name: "仍然保存这份音频" }));

    await waitFor(() => expect(services.repository.save).toHaveBeenCalledTimes(2));
    expect(services.repository.save).toHaveBeenLastCalledWith(
      expect.any(Object),
      { expectedDurationMs: demoSong.expectedDurationMs, allowDurationMismatch: true },
    );
  });

  it("does not replace the source when the remaining device storage is too small", async () => {
    const user = userEvent.setup();
    const services = makeServices({
      getStorageEstimate: vi.fn().mockResolvedValue({ usage: 95_000_000, quota: 100_000_000 }),
    });
    render(<AudioSourceManager song={demoSong} onAudioUrlChange={vi.fn()} services={services} />);

    await user.upload(
      screen.getByLabelText("导入原歌曲"),
      new File([new Uint8Array(1_000_000)], "large.aac", { type: "audio/aac" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("空间不足");
    expect(services.repository.save).not.toHaveBeenCalled();
  });
});
