import { useEffect, useState, useSyncExternalStore } from "react";
import { AudioSourceManager } from "./components/AudioSourceManager";
import { ScorePage } from "./components/ScorePage";
import { TrackToggle } from "./components/TrackToggle";
import { songLibrary } from "./data/demoSong";
import { clampPlaybackRate, getBarAtTime, getBarPage, getHitState } from "./domain/timeline";
import type { SongDefinition } from "./domain/song";
import { usePlaybackController } from "./hooks/usePlaybackController";
import { useWakeLock } from "./hooks/useWakeLock";
import { pwaLifecycle } from "./pwa";
import { createAudioRepository } from "./storage/audioRepository";

const libraryAudioRepository = createAudioRepository();

function formatTime(timeMs: number): string {
  const wholeSeconds = Math.floor(timeMs / 1_000);
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function App() {
  const [activeSong, setActiveSong] = useState<SongDefinition | null>(null);
  const pwaStatus = useSyncExternalStore(
    pwaLifecycle.subscribe,
    pwaLifecycle.getSnapshot,
    pwaLifecycle.getSnapshot,
  );

  return (
    <>
      {(pwaStatus.updateAvailable || pwaStatus.updateError) && (
        <aside className="pwa-notice" aria-live="polite">
          <span>{pwaStatus.updateError ?? "新版本已经准备好"}</span>
          {pwaStatus.updateAvailable && (
            <button type="button" onClick={() => void pwaLifecycle.applyUpdate()}>刷新使用新版本</button>
          )}
        </aside>
      )}
      {activeSong ? (
        <PracticeRoom song={activeSong} onBack={() => setActiveSong(null)} />
      ) : (
        <SongLibrary onOpenSong={setActiveSong} offlineReady={pwaStatus.offlineReady} />
      )}
    </>
  );
}

function SongLibrary({
  onOpenSong,
  offlineReady,
}: {
  onOpenSong: (song: SongDefinition) => void;
  offlineReady: boolean;
}) {
  const [localSongIds, setLocalSongIds] = useState<Set<string>>(new Set());
  const [storageReadable, setStorageReadable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void libraryAudioRepository.listMetadata().then(
      (records) => {
        if (!cancelled) setLocalSongIds(new Set(records.map((record) => record.songId)));
      },
      () => {
        if (!cancelled) setStorageReadable(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="library-shell">
      <header className="library-header">
        <span className="brand-mark" aria-hidden="true">◎</span>
        <div>
          <p>家庭非洲鼓</p>
          <h1>曲目库</h1>
        </div>
        <span className="offline-pill">{offlineReady ? "已可离线使用" : "离线练习"}</span>
      </header>
      <section className="library-intro">
        <h2>选一首歌，跟着鼓点练习</h2>
        <p>横屏观看四小节谱面。原歌曲和示范鼓声都能独立开关。</p>
      </section>
      <section className="song-list" aria-label="曲目列表">
        {songLibrary.map((song) => (
          <article className="song-row" key={song.id}>
            <div className="song-row__meter" aria-hidden="true">
              <span>B</span><span>T</span><span>S</span>
            </div>
            <div className="song-row__details">
              <h2>{song.title}</h2>
              <p>{song.artist} · {song.bpm} BPM · {song.timeSignature[0]}/{song.timeSignature[1]}</p>
            </div>
            <div className="song-row__status">
              {localSongIds.has(song.id)
                ? "离线可用"
                : song.builtInAudioUrl
                  ? "内置伴奏可用"
                  : storageReadable
                    ? "未导入"
                    : "需要重新导入"}
            </div>
            <button type="button" onClick={() => onOpenSong(song)} aria-label={`开始练习 ${song.title}`}>
              开始练习
            </button>
          </article>
        ))}
      </section>
      <p className="library-note">之后可为每首真实歌曲从“文件”App导入本机音频，歌曲不会上传。</p>
    </main>
  );
}

function PracticeRoom({ song, onBack }: { song: SongDefinition; onBack: () => void }) {
  const [loopStartBar, setLoopStartBar] = useState(1);
  const [loopEndBar, setLoopEndBar] = useState(4);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState(song.builtInAudioUrl);
  const playback = usePlaybackController(song, audioUrl);
  const { snapshot } = playback;
  const wakeLock = useWakeLock(snapshot.isPlaying || snapshot.isCountingIn);

  const activeBar = getBarAtTime(song, snapshot.currentTimeMs) ?? song.bars[0];
  const page = getBarPage(song, activeBar.number);
  const hitState = getHitState(song, snapshot.currentTimeMs);

  const setSpeed = (candidate: number) => playback.setRate(clampPlaybackRate(candidate));
  const updateLoop = (startBar: number, endBar: number, enabled = loopEnabled) => {
    const normalizedEnd = Math.max(startBar, endBar);
    setLoopStartBar(startBar);
    setLoopEndBar(normalizedEnd);
    playback.setLoop(
      enabled
        ? {
            startMs: song.bars[startBar - 1].startMs,
            endMs: song.bars[normalizedEnd - 1].endMs,
          }
        : null,
    );
  };
  const toggleLoop = () => {
    const enabled = !loopEnabled;
    setLoopEnabled(enabled);
    updateLoop(loopStartBar, loopEndBar, enabled);
  };
  const togglePlayback = async () => {
    setPlaybackError(null);
    if (snapshot.isPlaying || snapshot.isCountingIn) {
      playback.pause();
      return;
    }
    try {
      await playback.play();
    } catch {
      setPlaybackError("Safari 暂时无法播放，请再点一次播放键。");
    }
  };

  return (
    <main className="practice-shell">
      <header className="practice-header">
        <button className="back-button" type="button" onClick={onBack}>返回曲目库</button>
        <div>
          <p>正在练习</p>
          <h1>{song.title}</h1>
        </div>
        <div className="practice-position" aria-live="polite">
          <span>第 {activeBar.number} 小节</span>
          <strong>{formatTime(snapshot.currentTimeMs)}</strong>
        </div>
      </header>

      <p className="portrait-note">横屏可同时看到完整四小节</p>
      {snapshot.isCountingIn && <div className="count-in" role="status">准备开始 {snapshot.countInBeatsRemaining}</div>}
      {playbackError && <p className="playback-error" role="alert">{playbackError}</p>}
      <AudioSourceManager song={song} onAudioUrlChange={setAudioUrl} />
      <ScorePage
        bars={page}
        currentHitAtMs={hitState.current?.atMs ?? null}
        nextHitAtMs={hitState.next?.atMs ?? null}
      />

      <section className="practice-controls" aria-label="播放控制">
        <div className="transport-controls">
          <button type="button" aria-label="减速" onClick={() => setSpeed(snapshot.playbackRate - 0.05)}>−</button>
          <output aria-label="当前速度">{snapshot.playbackRate.toFixed(2)}×</output>
          <button type="button" aria-label="加速" onClick={() => setSpeed(snapshot.playbackRate + 0.05)}>＋</button>
          <button
            className="play-button"
            type="button"
            aria-label={snapshot.isPlaying || snapshot.isCountingIn ? "暂停播放" : "开始播放"}
            onClick={() => void togglePlayback()}
          >
            {snapshot.isPlaying || snapshot.isCountingIn ? "暂停" : "播放"}
          </button>
          <label className="progress-control">
            <span>进度</span>
            <input
              aria-label="播放进度"
              type="range"
              min="0"
              max={song.expectedDurationMs}
              step="10"
              value={snapshot.currentTimeMs}
              onChange={(event) => playback.seek(Number(event.currentTarget.value))}
            />
          </label>
        </div>
        <div className="loop-controls">
          <button type="button" className="loop-button" aria-label="小节循环" aria-pressed={loopEnabled} onClick={toggleLoop}>
            循环
          </button>
          <label>
            循环从
            <select aria-label="循环起始小节" value={loopStartBar} onChange={(event) => updateLoop(Number(event.currentTarget.value), loopEndBar)}>
              {song.bars.map((bar) => <option key={bar.number} value={bar.number}>第 {bar.number} 小节</option>)}
            </select>
          </label>
          <label>
            循环到
            <select aria-label="循环结束小节" value={loopEndBar} onChange={(event) => updateLoop(loopStartBar, Number(event.currentTarget.value))}>
              {song.bars.map((bar) => <option key={bar.number} value={bar.number}>第 {bar.number} 小节</option>)}
            </select>
          </label>
        </div>
        <div className="track-controls">
          <TrackToggle label="原歌曲" enabled={!snapshot.songMuted} volume={snapshot.songVolume} onEnabledChange={(enabled) => playback.setTrackMuted("song", !enabled)} onVolumeChange={(songVolume) => playback.setVolumes({ song: songVolume })} />
          <TrackToggle label="示范鼓声" enabled={!snapshot.drumMuted} volume={snapshot.drumVolume} onEnabledChange={(enabled) => playback.setTrackMuted("drums", !enabled)} onVolumeChange={(drumsVolume) => playback.setVolumes({ drums: drumsVolume })} />
          {wakeLock.supported && <span className="wake-lock-status">{wakeLock.active ? "屏幕常亮" : "屏幕可休眠"}</span>}
        </div>
      </section>
    </main>
  );
}
