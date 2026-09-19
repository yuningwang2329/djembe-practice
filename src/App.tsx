import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AudioSourceManager } from "./components/AudioSourceManager";
import { ScorePage } from "./components/ScorePage";
import { TrackToggle } from "./components/TrackToggle";
import { RhythmPatternPractice } from "./components/RhythmPatternPractice";
import { songLibrary } from "./data/demoSong";
import { lyricOffsets } from "./data/lyricOffsets";
import { lyricCharTimes } from "./data/lyricCharTimes";
import { clampPlaybackRate, getBarAtTime } from "./domain/timeline";
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
      {pwaStatus.checkMessage && (
        <div className="pwa-check-toast" role="status" aria-live="polite">
          <span>{pwaStatus.checkMessage}</span>
        </div>
      )}
      {activeSong ? (
        <PracticeRoom song={activeSong} onBack={() => setActiveSong(null)} />
      ) : (
        <SongLibrary
          onOpenSong={setActiveSong}
          offlineReady={pwaStatus.offlineReady}
          checking={pwaStatus.checking}
        />
      )}
    </>
  );
}

function SongLibrary({
  onOpenSong,
  offlineReady,
  checking = false,
}: {
  onOpenSong: (song: SongDefinition) => void;
  offlineReady: boolean;
  checking?: boolean;
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
        <div className="library-header__actions">
          <button
            type="button"
            className="check-update-btn"
            disabled={checking}
            onClick={() => void pwaLifecycle.checkForUpdate()}
            aria-label="检查更新"
          >
            {checking ? "⏳ 检查中..." : "🔄 检查更新"}
          </button>
          <span className="offline-pill">{offlineReady ? "已可离线使用" : "离线练习"}</span>
        </div>
      </header>
      <section className="library-intro">
        <h2>选一首歌，跟着鼓点练习</h2>
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
    </main>
  );
}

/**
 * 视觉提前量：用户偏好竖线先于正在放大的音符。移动竖线/歌词扫色/视窗；
 * 不用它补偿歌曲的拍点或歌词错误，也不作为蓝牙延迟校准值。
 */
const VISUAL_LEAD_KEY = "djembe.visualLeadMs";
const VISUAL_LEAD_MIN = 0;
const VISUAL_LEAD_MAX = 600;
const VISUAL_LEAD_STEP = 20;
/**
 * 默认 0：原先以为"画面慢半拍"是设备延迟，后来定位到真因是音符字母画在时值格子
 * 正中、而竖线按时间走（实测差 0.38 拍），已改为字母对齐拍点。这一项留着给
 * 蓝牙音箱之类的设备延迟用，按需调整即可。
 */
const VISUAL_LEAD_DEFAULT = 0;

function readVisualLead(): number {
  try {
    const stored = globalThis.localStorage?.getItem(VISUAL_LEAD_KEY);
    if (stored === null || stored === undefined) return VISUAL_LEAD_DEFAULT;
    const raw = Number(stored);
    if (!Number.isFinite(raw)) return VISUAL_LEAD_DEFAULT;
    return Math.min(VISUAL_LEAD_MAX, Math.max(VISUAL_LEAD_MIN, Math.round(raw)));
  } catch {
    return VISUAL_LEAD_DEFAULT;
  }
}

function PracticeRoom({ song, onBack }: { song: SongDefinition; onBack: () => void }) {
  const [practiceMode, setPracticeMode] = useState<"score" | "rhythm">("score");
  const [showHands, setShowHands] = useState(true);
  const [visualLeadMs, setVisualLeadMs] = useState(readVisualLead);
  const [loopStartBar, setLoopStartBar] = useState(1);
  const [loopEndBar, setLoopEndBar] = useState(4);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState(song.builtInAudioUrl);
  const [variantId, setVariantId] = useState(song.variants?.[0]?.id ?? "default");
  const activeBars = song.variants?.find((variant) => variant.id === variantId)?.bars ?? song.bars;
  // 谱面版本切换通过替换 bars 的派生歌曲实现，控制器随版本重建
  const effectiveSong = useMemo(() => ({ ...song, bars: activeBars }), [song, activeBars]);
  const playback = usePlaybackController(effectiveSong, audioUrl);
  const { snapshot } = playback;
  const wakeLock = useWakeLock(snapshot.isPlaying || snapshot.isCountingIn);

  // 画面用的时间：实际播放时间 + 提前量。进度条仍显示真实时间，不受影响。
  const displayTimeMs = snapshot.currentTimeMs + visualLeadMs;
  const activeBar = getBarAtTime(effectiveSong, displayTimeMs) ?? effectiveSong.bars[0];
  const countInBeat = snapshot.isCountingIn
    ? song.timeSignature[0] - snapshot.countInBeatsRemaining + 1
    : 0;

  const firstDrumHit = useMemo(() => {
    return effectiveSong.bars.flatMap((b) => b.hits).find((h) => h.atMs > 2000) ?? null;
  }, [effectiveSong]);
  const hasIntroRest = Boolean(firstDrumHit && firstDrumHit.atMs > 4000);

  const setSpeed = (candidate: number) => playback.setRate(clampPlaybackRate(candidate));
  const shiftVisualLead = (delta: number) => {
    setVisualLeadMs((prev) => {
      const next = Math.min(VISUAL_LEAD_MAX, Math.max(VISUAL_LEAD_MIN, prev + delta));
      try {
        globalThis.localStorage?.setItem(VISUAL_LEAD_KEY, String(next));
      } catch {
        // 隐私模式下可能写不了，忽略即可，本次会话内仍然生效
      }
      return next;
    });
  };
  const updateLoop = (startBar: number, endBar: number, enabled = loopEnabled) => {
    const normalizedEnd = Math.max(startBar, endBar);
    setLoopStartBar(startBar);
    setLoopEndBar(normalizedEnd);
    playback.setLoop(
      enabled
        ? {
            startMs: effectiveSong.bars[startBar - 1].startMs,
            endMs: effectiveSong.bars[normalizedEnd - 1].endMs,
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

  const seekAndPlay = async (timeMs: number) => {
    setPlaybackError(null);
    playback.pause(); // 也取消正在进行的倒数。
    if (snapshot.loop && (timeMs < snapshot.loop.startMs || timeMs >= snapshot.loop.endMs)) {
      setLoopEnabled(false);
      playback.setLoop(null);
    }
    playback.seek(timeMs);
    try {
      await playback.play({ countInBeats: 0 });
    } catch {
      setPlaybackError("Safari 暂时无法播放，请再点一次播放键。");
    }
  };

  return (
    <main className="practice-shell">
      <header className="practice-header">
        <button className="back-button" type="button" onClick={onBack}>返回曲目库</button>
        <div className="practice-header__info">
          <div className="practice-header__headline">
            <h1>{song.title}</h1>
            <div className="mode-pill-group" role="tablist" aria-label="练习模式切换">
              <button
                type="button"
                role="tab"
                aria-selected={practiceMode === "score"}
                className={`mode-pill ${practiceMode === "score" ? "mode-pill--active" : ""}`}
                onClick={() => setPracticeMode("score")}
              >
                歌曲乐谱
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={practiceMode === "rhythm"}
                className={`mode-pill ${practiceMode === "rhythm" ? "mode-pill--active" : ""}`}
                onClick={() => setPracticeMode("rhythm")}
              >
                节奏型
              </button>
            </div>
            <button
              type="button"
              className={`toggle-pill ${showHands ? "toggle-pill--active" : ""}`}
              onClick={() => setShowHands((prev) => !prev)}
              aria-label={showHands ? "隐藏左右手提示" : "显示左右手提示"}
            >
              左右手: {showHands ? "开" : "关"}
            </button>
            {practiceMode === "score" && hasIntroRest && (
              <button
                type="button"
                className="quick-entry-btn"
                onClick={() => {
                  const drumBar = effectiveSong.bars.find((b) => b.startMs <= firstDrumHit!.atMs && b.endMs > firstDrumHit!.atMs) ?? effectiveSong.bars[0];
                  void seekAndPlay(drumBar.startMs);
                }}
                title="跳过前奏，直接从第一个敲鼓点开始"
              >
                🥁 直达鼓点
              </button>
            )}
          </div>
        </div>
        <div className="practice-position" aria-live="polite">
          <span>第 {activeBar.number} 小节</span>
          <strong>{formatTime(snapshot.currentTimeMs)}</strong>
        </div>
      </header>

      {practiceMode === "rhythm" ? (
        <RhythmPatternPractice song={effectiveSong} showHands={showHands} />
      ) : (
        <>
          {song.variants && song.variants.length > 0 && (
            <div className="variant-switch" role="group" aria-label="谱面版本">
              <span className="variant-switch__label">谱面版本</span>
              {song.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={variantId === variant.id}
                  onClick={() => setVariantId(variant.id)}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          )}

          {snapshot.isCountingIn && (
            <div className="count-in" role="status">
              准备开始 {snapshot.countInBeatsRemaining}
            </div>
          )}
          {playbackError && <p className="playback-error" role="alert">{playbackError}</p>}
          <AudioSourceManager song={song} onAudioUrlChange={setAudioUrl} />
          <ScorePage
            bars={activeBars}
            currentTimeMs={snapshot.currentTimeMs}
            visualLeadMs={visualLeadMs}
            lyrics={effectiveSong.lyrics}
            preferTimedLyrics={effectiveSong.lyricTiming === 'recording'}
            lyricOffsetMs={effectiveSong.lyricTiming === 'recording' ? 0 : lyricOffsets[song.id] ?? 0}
            charTimes={effectiveSong.lyricTiming === 'recording' ? undefined : lyricCharTimes[song.id]}
            onSeekAndPlay={(timeMs) => void seekAndPlay(timeMs)}
            countInBeat={countInBeat}
            timeSignature={song.timeSignature}
            bpm={song.bpm}
            showHands={showHands}
            isPlaying={snapshot.isPlaying}
          />

          <section className="practice-controls" aria-label="播放控制">
            <div className="controls-row">
              <div className="transport-controls">
                <button
                  className="play-button"
                  type="button"
                  aria-label={snapshot.isPlaying || snapshot.isCountingIn ? "暂停播放" : "开始播放"}
                  onClick={() => void togglePlayback()}
                >
                  {snapshot.isPlaying || snapshot.isCountingIn ? "暂停" : "播放"}
                </button>
                <div className="speed-control-group">
                  <button type="button" aria-label="减速" onClick={() => setSpeed(snapshot.playbackRate - 0.05)}>−</button>
                  <output aria-label="当前速度">{snapshot.playbackRate.toFixed(2)}×</output>
                  <button type="button" aria-label="加速" onClick={() => setSpeed(snapshot.playbackRate + 0.05)}>＋</button>
                </div>
                <div className="speed-control-group visual-lead-group">
                  <button
                    type="button"
                    aria-label="画面提前量减少"
                    onClick={() => shiftVisualLead(-VISUAL_LEAD_STEP)}
                  >
                    −
                  </button>
                  <output
                    aria-label="画面提前量"
                    title="竖线、歌词扫色和视窗一起提前；不改变实际鼓声、音符放大和演唱时间。"
                  >
                    提前 {visualLeadMs}ms
                  </output>
                  <button
                    type="button"
                    aria-label="画面提前量增加"
                    onClick={() => shiftVisualLead(VISUAL_LEAD_STEP)}
                  >
                    ＋
                  </button>
                </div>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-header">
                  <span>播放进度</span>
                  <span>{formatTime(snapshot.currentTimeMs)} / {formatTime(song.expectedDurationMs)}</span>
                </div>
                <input
                  aria-label="播放进度"
                  type="range"
                  min="0"
                  max={song.expectedDurationMs}
                  step="10"
                  value={snapshot.currentTimeMs}
                  onChange={(event) => playback.seek(Number(event.currentTarget.value))}
                />
              </div>
            </div>

            <div className="controls-row controls-row--sub">
              <div className="loop-controls">
                <button type="button" className="loop-button" aria-label="小节循环" aria-pressed={loopEnabled} onClick={toggleLoop}>
                  小节循环
                </button>
                <label>
                  从
                  <select aria-label="循环起始小节" value={loopStartBar} onChange={(event) => updateLoop(Number(event.currentTarget.value), loopEndBar)}>
                    {effectiveSong.bars.map((bar) => <option key={bar.number} value={bar.number}>第 {bar.number} 节</option>)}
                  </select>
                </label>
                <label>
                  到
                  <select aria-label="循环结束小节" value={loopEndBar} onChange={(event) => updateLoop(loopStartBar, Number(event.currentTarget.value))}>
                    {effectiveSong.bars.map((bar) => <option key={bar.number} value={bar.number}>第 {bar.number} 节</option>)}
                  </select>
                </label>
              </div>
              <div className="track-controls">
                <TrackToggle label="原歌曲" enabled={!snapshot.songMuted} volume={snapshot.songVolume} onEnabledChange={(enabled) => playback.setTrackMuted("song", !enabled)} onVolumeChange={(songVolume) => playback.setVolumes({ song: songVolume })} />
                <TrackToggle label="示范鼓声" enabled={!snapshot.drumMuted} volume={snapshot.drumVolume} onEnabledChange={(enabled) => playback.setTrackMuted("drums", !enabled)} onVolumeChange={(drumsVolume) => playback.setVolumes({ drums: drumsVolume })} />
                {wakeLock.supported && <span className="wake-lock-status">{wakeLock.active ? "屏幕常亮" : "屏幕可休眠"}</span>}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
