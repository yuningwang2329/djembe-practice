import { useEffect, useRef, useState } from "react";
import type { RhythmPattern, SongDefinition } from "../domain/song";
import { createDrumSynth, type DrumSynth } from "../playback/drumSynth";
import { ScorePage } from "./ScorePage";

interface RhythmPatternPracticeProps {
  song: SongDefinition;
  showHands: boolean;
}

export function RhythmPatternPractice({ song, showHands }: RhythmPatternPracticeProps) {
  const patterns = song.rhythmPatterns ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activePattern: RhythmPattern | undefined = patterns[selectedIndex] ?? patterns[0];

  const [bpm, setBpm] = useState(song.bpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [countIn, setCountIn] = useState<number | null>(null);

  const synthRef = useRef<DrumSynth | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const playStartRef = useRef<{ wallStart: number; barMs: number } | null>(null);

  const activeBar = activePattern?.bars[0];
  const barBeats = activeBar?.beats ?? 4;
  const beatMs = Math.round(60_000 / bpm);
  const barDurationMs = beatMs * barBeats;

  // 速度变化时派生小节时长与音符毫秒
  const effectiveBar = activeBar
    ? {
        ...activeBar,
        startMs: 0,
        endMs: barDurationMs,
        hits: activeBar.hits.map((hit) => {
          const ratio = activeBar.endMs > 0 ? hit.atMs / activeBar.endMs : 0;
          return {
            ...hit,
            atMs: Math.round(ratio * barDurationMs),
          };
        }),
      }
    : null;

  useEffect(() => {
    setBpm(song.bpm);
    setSelectedIndex(0);
    setIsPlaying(false);
    setCurrentTimeMs(0);
    setCountIn(null);
  }, [song]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  function ensureAudio(): DrumSynth {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
      synthRef.current = createDrumSynth(audioCtxRef.current);
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return synthRef.current!;
  }

  function handleTogglePlay() {
    if (isPlaying || countIn !== null) {
      stopLoop();
    } else {
      startLoopWithCountIn();
    }
  }

  function stopLoop() {
    setIsPlaying(false);
    setCountIn(null);
    setCurrentTimeMs(0);
    playStartRef.current = null;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (synthRef.current) synthRef.current.cancel();
  }

  function startLoopWithCountIn() {
    const synth = ensureAudio();
    stopLoop();

    // 4 拍预备倒数
    let beat = 4;
    setCountIn(beat);

    const playMetronomeTick = () => {
      synth.schedule(
        { atMs: 0, stroke: "tone", hand: "R", dynamics: "soft" },
        audioCtxRef.current!.currentTime,
        0.5,
      );
    };

    playMetronomeTick();

    const timer = setInterval(() => {
      beat -= 1;
      if (beat > 0) {
        setCountIn(beat);
        playMetronomeTick();
      } else {
        clearInterval(timer);
        setCountIn(null);
        startActualLoop();
      }
    }, beatMs);
  }

  function startActualLoop() {
    if (!effectiveBar) return;
    const synth = ensureAudio();
    setIsPlaying(true);

    const startTime = performance.now();
    playStartRef.current = { wallStart: startTime, barMs: barDurationMs };

    // 调度首次循环鼓点
    scheduleBar(synth, 0);

    let currentBarIndex = 0;

    const tick = (now: number) => {
      if (!playStartRef.current) return;
      const elapsed = now - playStartRef.current.wallStart;
      const barMs = playStartRef.current.barMs;
      const loopTime = elapsed % barMs;
      setCurrentTimeMs(loopTime);

      const nextBarIndex = Math.floor(elapsed / barMs);
      if (nextBarIndex > currentBarIndex) {
        currentBarIndex = nextBarIndex;
        scheduleBar(synth, 0.05);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }

  function scheduleBar(synth: DrumSynth, leadTimeSeconds: number) {
    if (!effectiveBar || !audioCtxRef.current) return;
    const baseAudioTime = audioCtxRef.current.currentTime + leadTimeSeconds;
    effectiveBar.hits.forEach((hit) => {
      const hitAudioTime = baseAudioTime + hit.atMs / 1000;
      synth.schedule(hit, hitAudioTime, 0.95);
    });
  }

  if (!patterns.length || !effectiveBar) {
    return (
      <div className="rhythm-practice-empty">
        <p>暂无精选节奏型，请在歌曲乐谱模式下跟练整首曲目。</p>
      </div>
    );
  }

  return (
    <section className="rhythm-practice" aria-label="节奏型专项练习">
      <header className="rhythm-practice__header">
        <div className="rhythm-pattern-tabs" role="tablist" aria-label="核心节奏型列表">
          {patterns.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={idx === selectedIndex}
              className={`rhythm-pattern-tab ${idx === selectedIndex ? "rhythm-pattern-tab--active" : ""}`}
              onClick={() => {
                stopLoop();
                setSelectedIndex(idx);
              }}
            >
              <strong>{p.name}</strong>
              <span>{p.patternText}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="rhythm-practice__card">
        <div className="rhythm-practice__meta">
          <h2>{activePattern.name}</h2>
          <p className="rhythm-practice__pattern-text">{activePattern.patternText}</p>
          {activePattern.description && (
            <p className="rhythm-practice__desc">{activePattern.description}</p>
          )}
        </div>

        {countIn !== null && (
          <div className="count-in count-in--pattern" role="status">
            准备开始 {countIn}
          </div>
        )}

        <div className="rhythm-practice__score">
          <ScorePage
            bars={[effectiveBar]}
            currentTimeMs={currentTimeMs}
            timeSignature={[4, 4]}
            bpm={bpm}
            showHands={showHands}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      <footer className="rhythm-practice__controls">
        <div className="rhythm-speed-controls">
          <span>练习速度：</span>
          <button
            type="button"
            aria-label="减速"
            onClick={() => {
              stopLoop();
              setBpm((b) => Math.max(50, b - 5));
            }}
          >
            −5
          </button>
          <span className="rhythm-bpm-display">{bpm} BPM</span>
          <button
            type="button"
            aria-label="加速"
            onClick={() => {
              stopLoop();
              setBpm((b) => Math.min(160, b + 5));
            }}
          >
            +5
          </button>
          <div className="rhythm-speed-presets">
            {[60, 80, 100, 116, 128].map((presetBpm) => (
              <button
                key={presetBpm}
                type="button"
                className={`preset-bpm-btn ${bpm === presetBpm ? "preset-bpm-btn--active" : ""}`}
                onClick={() => {
                  stopLoop();
                  setBpm(presetBpm);
                }}
              >
                {presetBpm}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`play-button rhythm-play-btn ${isPlaying || countIn !== null ? "rhythm-play-btn--active" : ""}`}
          onClick={handleTogglePlay}
        >
          {isPlaying || countIn !== null ? "暂停循环" : "开始循环跟练"}
        </button>
      </footer>
    </section>
  );
}
