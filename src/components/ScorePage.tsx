import type { Bar, HitEvent, Stroke, SongDefinition } from "../domain/song";
import { strokeLabels } from "../domain/song";
import { useLayoutEffect, useRef } from "react";

interface ScorePageProps {
  bars: Bar[];
  currentTimeMs: number;
  /** 倒数中的拍号（1 起），0 表示不在倒数 */
  countInBeat?: number;
  /** 拍号（如 4/4）与速度，显示在谱面上方 */
  timeSignature?: [number, number];
  bpm?: number;
  lyrics?: SongDefinition["lyrics"];
  onSeekAndPlay?: (timeMs: number) => void;
  showHands?: boolean;
  isPlaying?: boolean;
}

const ACTIVE_WINDOW_MS = 150;

/**
 * 连续非洲鼓谱：每行 4 小节，视窗围绕当前行缓慢移动，提前露出下一行。
 * 独音独占一拍为四分音符（不带下划线）；两个八分紧邻共一条下划线；
 * 空拍只写一个 0；段落（前奏/进唱/副歌…）标在小节左上角；
 * 歌词词组按小节对位（lyricSpan 跨几小节就居中于几小节下方）。
 * 速度参考「阿波非洲鼓」教学谱排版。
 */
interface BeatNote { hit: HitEvent | null; duration: number }

function beatPairs(bar: Bar): BeatNote[][] {
  const sixteenthMs = (bar.endMs - bar.startMs) / bar.beats / 4;
  const bySlot = new Map<number, HitEvent>();
  for (const hit of bar.hits) {
    const index = Math.round((hit.atMs - bar.startMs) / sixteenthMs);
    if (index >= 0 && index < bar.beats * 4) bySlot.set(index, hit);
  }
  return Array.from({ length: bar.beats }, (_, beat) => {
    const notes: BeatNote[] = [];
    for (let slot = 0; slot < 4;) {
      let end = slot + 1;
      while (end < 4 && !bySlot.has(beat * 4 + end)) end++;
      notes.push({ hit: bySlot.get(beat * 4 + slot) ?? null, duration: end - slot });
      slot = end;
    }
    return notes;
  });
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

interface NoteVisualPoint {
  attackMs: number;
  centerPercent: number;
}

function getBarNoteVisualPoints(bar: Bar): NoteVisualPoint[] {
  const points: NoteVisualPoint[] = [];
  const pairs = beatPairs(bar);
  const totalSixteenths = bar.beats * 4;
  const barDuration = bar.endMs - bar.startMs;

  let currentSlot = 0;
  for (let beat = 0; beat < pairs.length; beat++) {
    const notes = pairs[beat];
    for (let n = 0; n < notes.length; n++) {
      const note = notes[n];
      const startSlot = currentSlot;
      const endSlot = currentSlot + note.duration;
      const attackMs = bar.startMs + (startSlot / totalSixteenths) * barDuration;
      const centerPercent = ((startSlot + endSlot) / 2 / totalSixteenths) * 100;
      points.push({ attackMs, centerPercent });
      currentSlot = endSlot;
    }
  }
  return points;
}

export function getPlayheadPercentInBar(bar: Bar, timeMs: number): number {
  if (timeMs <= bar.startMs) {
    const points = getBarNoteVisualPoints(bar);
    return points[0]?.centerPercent ?? 0;
  }
  if (timeMs >= bar.endMs) {
    return 100;
  }

  const points = getBarNoteVisualPoints(bar);
  if (points.length === 0) {
    return clamp01((timeMs - bar.startMs) / (bar.endMs - bar.startMs)) * 100;
  }

  if (timeMs < points[0].attackMs) {
    return points[0].centerPercent;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    if (timeMs >= current.attackMs && timeMs < next.attackMs) {
      const span = next.attackMs - current.attackMs;
      const progress = span > 0 ? (timeMs - current.attackMs) / span : 0;
      return current.centerPercent + progress * (next.centerPercent - current.centerPercent);
    }
  }

  const last = points[points.length - 1];
  const remainingTime = bar.endMs - last.attackMs;
  const progress = remainingTime > 0 ? (timeMs - last.attackMs) / remainingTime : 1;
  return last.centerPercent + progress * (100 - last.centerPercent);
}

export function ScorePage({
  bars,
  currentTimeMs,
  countInBeat = 0,
  timeSignature,
  bpm,
  lyrics,
  onSeekAndPlay,
  showHands = true,
  isPlaying = false,
}: ScorePageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(currentTimeMs);
  timeRef.current = currentTimeMs;
  const followRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const follow = () => {
      viewport.style.setProperty("--viewport-height", `${viewport.clientHeight}px`);
      const blocks = Array.from(viewport.querySelectorAll<HTMLElement>(".score-page__block"));
      if (!blocks.length) return;
      const time = timeRef.current;
      const found = blocks.findIndex((block) => time < Number(block.dataset.end));
      const index = found < 0 ? blocks.length - 1 : found;
      const block = blocks[index];
      const start = Number(block.dataset.start);
      const end = Number(block.dataset.end);
      const stride = blocks[index + 1]
        ? blocks[index + 1].offsetTop - block.offsetTop
        : index > 0 ? block.offsetTop - blocks[index - 1].offsetTop : block.offsetHeight;
      // 每行播放期间只移动一行高度，换行处连续；跳转和循环直接跟随音频位置。
      const progress = clamp01((time - start) / (end - start));
      viewport.scrollTop = Math.max(0, block.offsetTop + block.offsetHeight / 2
        - viewport.clientHeight * 0.4 + (progress - 0.5) * stride);
    };
    followRef.current = follow;
    follow();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(follow);
    observer?.observe(viewport);
    return () => { observer?.disconnect(); followRef.current = () => {}; };
  }, [bars]);

  useLayoutEffect(() => { followRef.current(); }, [currentTimeMs]);
  const activeBar =
    bars.find((bar) => currentTimeMs >= bar.startMs && currentTimeMs < bar.endMs) ?? null;
  const nextHit =
    bars
      .flatMap((bar) => bar.hits)
      .filter((hit) => hit.atMs > currentTimeMs)
      .at(0) ?? null;
  const beatCount = bars[0]?.beats ?? 4;
  const latestHit = activeBar?.hits.filter(hit => hit.atMs <= currentTimeMs).at(-1);
  const sixteenthMs = bpm ? Math.round(60_000 / bpm / 4) : 125;
  const activeWindowMs = Math.min(140, Math.max(70, Math.round(sixteenthMs * 0.85)));

  function hitState(hit: HitEvent): "current" | "next" | "idle" {
    if (latestHit === hit && currentTimeMs - hit.atMs <= activeWindowMs) return "current";
    if (nextHit && hit.atMs === nextHit.atMs && nextHit.atMs - currentTimeMs <= 1500) return "next";
    return "idle";
  }

  function strokeChar(hit: HitEvent) {
    const label = strokeLabels[hit.stroke];
    const letter = hit.dynamics === "soft" ? label.letter.toLowerCase() : label.letter;
    return (
      <span
        className={`score-char score-char--${hit.stroke}`}
        data-hit-at={hit.atMs}
        data-state={hitState(hit)}
        aria-label={`${hit.dynamics === "soft" ? "轻击 " : ""}${label.name} ${letter}，${hit.hand} 手`}
        role={onSeekAndPlay ? "button" : undefined}
        tabIndex={onSeekAndPlay ? 0 : undefined}
        data-seekable={onSeekAndPlay ? "true" : undefined}
        title={onSeekAndPlay ? "从这个鼓点播放" : undefined}
        onClick={onSeekAndPlay ? (event) => {
          event.stopPropagation();
          onSeekAndPlay(hit.atMs);
        } : undefined}
        onKeyDown={onSeekAndPlay ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onSeekAndPlay(hit.atMs);
          }
        } : undefined}
      >
        <b className="score-char__letter">{letter}</b>
        {showHands && <i className={`score-hand score-hand--${hit.hand} score-char__hand`}>{hit.hand}</i>}
      </span>
    );
  }

  function beatCell(notes: BeatNote[], key: number) {
    // 空拍：只写一个 0，不占两个八分格
    if (notes.every(note => !note.hit)) {
      return (
        <div className="score-beat score-beat--rest" key={key}>
          <span className="score-rest" aria-label="休止">
            0
          </span>
        </div>
      );
    }
    // 独音落在拍头：四分音符，不带下划线
    const isQuarter = notes.length === 1;
    return (
      <div className="score-beat" key={key}>
        <span
          className={
            isQuarter ? "score-group score-group--quarter" : `score-group score-group--eighths${notes.some(note => note.duration === 1) ? " score-group--dense" : ""}${notes.length === 4 ? " score-group--four" : ""}`
          }
        >
          {notes.map((note, index) => (
            <span className="score-note" key={index}
              data-duration={note.duration === 1 ? "sixteenth" : note.duration === 2 ? "eighth" : "quarter"}
              style={{ flex: note.duration }}
            >
              {note.hit ? strokeChar(note.hit) : (
                <span className="score-char score-char--rest" aria-label="休止"><b className="score-char__letter">0</b></span>
              )}
            </span>
          ))}
        </span>
      </div>
    );
  }

  /** 全曲连续排版，每行 3 小节（适配平板与宽屏视野） */
  const rows: Bar[][] = [];
  for (let index = 0; index < bars.length; index += 3) {
    rows.push(bars.slice(index, index + 3));
  }

  // 计算首个鼓点提示，解决“4321 之后不知道何时敲”的问题
  const firstDrumHit = bars.flatMap(bar => bar.hits).find(hit => hit.atMs >= 0) ?? null;
  const beatMs = bpm ? Math.round(60_000 / bpm) : 500;
  let drumEntryPrompt: string | null = null;
  if (firstDrumHit && currentTimeMs < firstDrumHit.atMs) {
    const timeUntilDrum = firstDrumHit.atMs - currentTimeMs;
    if (timeUntilDrum <= beatMs * 4 && timeUntilDrum > 0) {
      const remainingBeats = Math.max(1, Math.ceil(timeUntilDrum / beatMs));
      drumEntryPrompt = `🥁 准备进鼓 ${remainingBeats}`;
    }
  } else if (firstDrumHit && currentTimeMs >= firstDrumHit.atMs && currentTimeMs - firstDrumHit.atMs < beatMs) {
    drumEntryPrompt = `🥁 进鼓！敲！`;
  }

  return (
    <section className="score" aria-label="可跟练鼓谱">
      {drumEntryPrompt && (
        <div className="drum-entry-cue" role="status" aria-live="assertive">
          {drumEntryPrompt}
        </div>
      )}
      <div className="score-legend" aria-hidden="true">
        {bars.some(bar => bar.hits.some(hit => hit.dynamics === "soft")) ? <span className="score-meta">小写 b/s：轻击</span> : null}
        {(["bass", "tone", "slap"] as Stroke[]).map((stroke) => (
          <span key={stroke} className={`score-legend__item score-legend__item--${stroke}`}>
            <b>{strokeLabels[stroke].letter}</b>
            {strokeLabels[stroke].name}
          </span>
        ))}
        {timeSignature && bpm ? (
          <span className="score-meta">
            节奏 {timeSignature[0]}/{timeSignature[1]} · 速度 {bpm}
          </span>
        ) : null}
        {showHands && (
          <span className="score-legend__hands">
            <i className="score-hand score-hand--R">R</i> 右手
            <i className="score-hand score-hand--L">L</i> 左手
          </span>
        )}
      </div>

      <div className="score-viewport" ref={viewportRef} tabIndex={0} aria-label="连续鼓谱，暂停后可上下滑动">
      <div className="score-page">
        {rows.map((rowBars) => {
          const rowKey = rowBars[0]?.number ?? 0;
          const rowStart = rowBars[0].startMs;
          const rowEnd = rowBars[rowBars.length - 1].endMs;
          const rowLyrics = lyrics?.filter((cue) => cue.startMs < rowEnd && cue.endMs > rowStart);
          return (
            <div className="score-page__block" key={rowKey} data-start={rowStart} data-end={rowEnd}>
              <div className="score-page__beats" aria-hidden="true">
                {rowBars.map((bar) => (
                  <div
                    className="score-page__bar-beats"
                    key={`beats-${bar.number}`}
                    style={{ flex: bar.beats }}
                  >
                    {bar.timeSignature && (
                      <span className="score-page__meter-space" aria-hidden="true" />
                    )}
                    {Array.from({ length: bar.beats }, (_, index) => (
                      <span
                        key={index}
                        className={
                          countInBeat === index + 1 && activeBar?.number === bar.number
                            ? "score-beat--count"
                            : undefined
                        }
                      >
                        {index + 1}
                      </span>
                    ))}
                  </div>
                ))}
              </div>

              <div className="score-page__row">
                {rowBars.map((bar) => {
                  const isActive = activeBar?.number === bar.number;
                  return (
                    <article
                      className={isActive ? "score-bar score-bar--active" : "score-bar"}
                      key={bar.number}
                      style={{ flex: bar.beats }}
                      aria-label={`第 ${bar.number} 小节`}
                      tabIndex={onSeekAndPlay ? 0 : undefined}
                      data-seekable={onSeekAndPlay ? "true" : undefined}
                      title={onSeekAndPlay ? "点击从这里播放" : undefined}
                      onClick={onSeekAndPlay ? () => onSeekAndPlay(bar.startMs) : undefined}
                      onKeyDown={onSeekAndPlay ? (event) => {
                        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          onSeekAndPlay(bar.startMs);
                        }
                      } : undefined}
                    >
                      <div className="score-bar__header" aria-hidden="true">
                        <span className="score-bar__no">{bar.number}</span>
                        {bar.section && (
                          <span className="score-section">{bar.section}</span>
                        )}
                      </div>
                      <div className="score-bar__content">
                        {bar.timeSignature && (
                          <div
                            className="score-bar__meter"
                            aria-label={`拍号切换 ${bar.timeSignature[0]}/${bar.timeSignature[1]}`}
                          >
                            <span className="score-bar__meter-num">{bar.timeSignature[0]}</span>
                            <span className="score-bar__meter-num">{bar.timeSignature[1]}</span>
                          </div>
                        )}
                        <div className="score-bar__grid">
                          {beatPairs(bar).map((pair, index) => beatCell(pair, index))}
                          {isActive && (
                            <div
                              className="score-playhead"
                              style={{
                                left: `${Math.round(getPlayheadPercentInBar(bar, currentTimeMs) * 100) / 100}%`,
                              }}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {rowBars.some((bar) => Boolean(bar.lyric || (bar.lyricBeats && bar.lyricBeats.length > 0))) ? (
                <div className="score-lyrics score-lyrics--bar-aligned" aria-label="本行歌词">
                  {rowBars.map((bar) => {
                    const isCurrent = activeBar?.number === bar.number;
                    const hasBeats = Boolean(bar.lyricBeats && bar.lyricBeats.length > 0);
                    const text = bar.lyric ?? "";
                    return (
                      <div
                        className="score-bar-lyrics"
                        key={`lyric-${bar.number}`}
                        style={{ flex: bar.beats }}
                      >
                        {bar.timeSignature && (
                          <span className="score-page__meter-space" aria-hidden="true" />
                        )}
                        <p
                          className="score-lyric score-lyric--timed"
                          data-state={isCurrent && Boolean(text || hasBeats) ? "current" : "idle"}
                          aria-label={text || undefined}
                        >
                          {hasBeats ? (
                            <span className="score-lyric__beats">
                              {Array.from({ length: bar.beats }, (_, bIdx) => {
                                const char = bar.lyricBeats?.[bIdx] ?? "";
                                return (
                                  <span className="score-lyric__beat-cell" key={bIdx}>
                                    <span className="score-lyric__char">{char}</span>
                                  </span>
                                );
                              })}
                            </span>
                          ) : (
                            <span className="score-lyric__phrase">
                              <span className="score-lyric__char">{text}</span>
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : lyrics ? (
                <div className="score-lyrics" aria-label="本行歌词">
                  {rowLyrics?.map((cue) => {
                    const characters = Array.from(cue.text.replace(/\s/g, ""));
                    // 均匀铺字用于视觉预读，不把它宣称为逐字人声识别时间。
                    const positions = characters.map((char, i) => ({ char,
                      at: cue.startMs + (i + 0.5) / characters.length * (cue.endMs - cue.startMs),
                    })).filter(({ at }) => at >= rowStart && at < rowEnd);
                    if (!positions.length) return null;
                    const start = Math.max(cue.startMs, rowStart);
                    const end = Math.min(cue.endMs, rowEnd);
                    return <p key={cue.startMs} className="score-lyric score-lyric--timed"
                      aria-label={positions.map(({ char }) => char).join("")}
                      data-state={currentTimeMs >= Math.max(cue.startMs, rowStart) && currentTimeMs < Math.min(cue.endMs, rowEnd) ? "current" : "idle"}
                      style={{
                        left: `${clamp01((cue.startMs - rowStart) / (rowEnd - rowStart)) * 100}%`,
                        width: `${(Math.min(cue.endMs, rowEnd) - Math.max(cue.startMs, rowStart)) / (rowEnd - rowStart) * 100}%`,
                      }}>
                      {positions.map(({ char, at }, i) => <span className="score-lyric__char" key={i}
                        style={{ left: `${(at - start) / (end - start) * 100}%` }}>{char}</span>)}
                    </p>;
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      </div>
    </section>
  );
}
