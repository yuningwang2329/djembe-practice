import type { Bar, HitEvent, Stroke, SongDefinition } from "../domain/song";
import { strokeLabels } from "../domain/song";
import { memo, useLayoutEffect, useMemo, useRef } from "react";

interface ScorePageProps {
  bars: Bar[];
  currentTimeMs: number;
  /** 额外视觉提前量：只移动竖线和视窗，不移动鼓音放大或歌词高亮。 */
  visualLeadMs?: number;
  /** 倒数中的拍号（1 起），0 表示不在倒数 */
  countInBeat?: number;
  /** 拍号（如 4/4）与速度，显示在谱面上方 */
  timeSignature?: [number, number];
  bpm?: number;
  lyrics?: SongDefinition["lyrics"];
  preferTimedLyrics?: boolean;
  /** 歌词高亮的整体微调（毫秒）。只动歌词，不动鼓点、播放头或实际播放。 */
  lyricOffsetMs?: number;
  /** 逐字演唱时刻：小节号 -> 与 lyricBeats 等长的数组，每项是该词块内各字的毫秒时刻。 */
  charTimes?: Record<number, number[][]>;
  onSeekAndPlay?: (timeMs: number) => void;
  showHands?: boolean;
  isPlaying?: boolean;
}

/**
 * 连续非洲鼓谱：每行 3 小节，视窗围绕当前行缓慢移动，提前露出下一行。
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

const beatPairsCache = new WeakMap<Bar, BeatNote[][]>();
export function getCachedBeatPairs(bar: Bar): BeatNote[][] {
  let cached = beatPairsCache.get(bar);
  if (!cached) {
    cached = beatPairs(bar);
    beatPairsCache.set(bar, cached);
  }
  return cached;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

const HAN = /[一-鿿]/;

/**
 * 校验一个小节的逐字演唱时刻是否可信。
 *
 * 排除以下声学对齐崩溃与退避数据：
 * 1. 时间倒退：后字时刻 < 前字时刻
 * 2. 严重坍缩：连续 ≥ 3 个字符时刻完全锁死相同
 * 3. 密集伪造压缩：连续 ≥ 3 个字符间隔 < 30ms
 */
export function isUsableTimes(times: number[][] | undefined): boolean {
  if (!times || !Array.isArray(times)) return false;
  const flat: number[] = [];
  for (const cell of times) {
    if (!Array.isArray(cell)) continue;
    for (const t of cell) {
      if (typeof t === "number" && !Number.isNaN(t)) {
        flat.push(t);
      }
    }
  }
  if (flat.length === 0) return false;
  if (flat.length === 1) return true;

  for (let i = 1; i < flat.length; i += 1) {
    if (flat[i] < flat[i - 1]) return false;
  }

  let repeatCount = 1;
  for (let i = 1; i < flat.length; i += 1) {
    if (flat[i] === flat[i - 1]) {
      repeatCount += 1;
      if (repeatCount >= 3) return false;
    } else {
      repeatCount = 1;
    }
  }

  let denseCount = 0;
  for (let i = 1; i < flat.length; i += 1) {
    if (flat[i] - flat[i - 1] < 30) {
      denseCount += 1;
      if (denseCount >= 2) return false;
    } else {
      denseCount = 0;
    }
  }

  return true;
}

export interface PlacedChar {
  ch: string;
  startMs: number;
  endMs: number;
  leftPercent: number;
  startPercent: number;
  endPercent: number;
}

/**
 * 简谱人性化歌词排版（Humanized Beat-Aligned Placement）：
 * 1. 词块首字精准对齐该拍鼓音（例如《桥边姑娘》第一句"暖"正对 B 下方）；
 * 2. 拍内多字自适应等距居中分布（连续双B下4字两两间距严格相等，严禁前两个一组后两个一组）；
 * 3. 词与词之间根据节拍自然呼吸，彻底告别原版的挤成一坨或僵硬断裂；
 * 4. 无论是否有 CTC 逐字数据，均能稳定排版渲染，永不丢字；
 * 5. 布局与演唱时间分离：歌词按录音时间变色，竖线保留独立的视觉提前量。
 */
export function getHumanizedPlacedChars(
  bar: Bar,
  times: number[][] | undefined,
  offsetMs = 0,
): PlacedChar[] | null {
  if (!bar.lyricBeats || bar.lyricBeats.length === 0) return null;
  const beats = bar.beats || 4;
  const beatMs = (bar.endMs - bar.startMs) / beats;
  const usable = isUsableTimes(times);
  const result: PlacedChar[] = [];

  // 收集小节内有效的逐字时刻（供外部调用与单调时刻校验）
  const allFlatTimes: number[] = [];
  if (usable && times) {
    for (const cell of times) {
      if (!Array.isArray(cell)) continue;
      for (const t of cell) {
        if (typeof t === "number") allFlatTimes.push(t);
      }
    }
  }

  let globalHanIdx = 0;
  bar.lyricBeats.forEach((cellText, bIdx) => {
    if (!cellText) return;
    const chars = Array.from(cellText);
    if (chars.length === 0) return;

    const slotWidth = 100 / beats;
    const slotStart = bIdx * slotWidth;
    const charWidth = slotWidth / chars.length;

    chars.forEach((ch, cIdx) => {
      // 区域内自适应等距居中：
      // 单字居中于音符正下方；两个BB下4字时两两间距完全相等；字在各自拍位区间内严格居中
      const startPercent = slotStart + cIdx * charWidth;
      const endPercent = startPercent + charWidth;
      const leftPercent = (startPercent + endPercent) / 2;

      const charDuration = beatMs / chars.length;
      let startMs = bar.startMs + bIdx * beatMs + offsetMs + cIdx * charDuration;
      let endMs = startMs + charDuration;

      const isHan = HAN.test(ch);
      if (allFlatTimes.length > 0 && isHan && globalHanIdx < allFlatTimes.length) {
        const t = allFlatTimes[globalHanIdx];
        globalHanIdx += 1;
        startMs = t;
        const nextT =
          globalHanIdx < allFlatTimes.length
            ? allFlatTimes[globalHanIdx]
            : t + Math.min(400, Math.max(150, charDuration));
        endMs = nextT;
      }

      result.push({
        ch,
        startMs,
        endMs,
        leftPercent,
        startPercent,
        endPercent,
      });
    });
  });

  return result.length > 0 ? result : null;
}

const placedCharsCache = new WeakMap<
  Bar,
  { times?: number[][]; offsetMs: number; result: PlacedChar[] | null }
>();
export function getCachedPlacedChars(
  bar: Bar,
  times: number[][] | undefined,
  offsetMs = 0,
): PlacedChar[] | null {
  const cached = placedCharsCache.get(bar);
  if (cached && cached.times === times && cached.offsetMs === offsetMs) {
    return cached.result;
  }
  const result = getHumanizedPlacedChars(bar, times, offsetMs);
  placedCharsCache.set(bar, { times, offsetMs, result });
  return result;
}

export function placedChars(
  bar: Bar,
  times: number[][] | undefined,
): PlacedChar[] | null {
  return getHumanizedPlacedChars(bar, times, 0);
}

/**
 * 计算小节内播放头的百分比（带超前半拍击响提前量）。
 * 保证在激活小节内从 0% 恒速滑行到 100%。
 */
export function getPlayheadPercentInBar(bar: Bar, timeMs: number): number {
  const duration = bar.endMs - bar.startMs;
  if (duration <= 0) return 0;
  const beatMs = duration / (bar.beats || 4);
  const leadMs = beatMs * 0.48;
  const t = timeMs + leadMs;
  if (t <= bar.startMs) return 0;
  if (t >= bar.endMs) return 100;
  return clamp01((t - bar.startMs) / duration) * 100;
}

/**
 * 精准无缝的跨小节播放头定位器：
 * 将时间轴划分为无空隙、无重叠的小节活跃区间。
 * 上一个小节到达 100% 的同一时刻，下一个小节正好以 0% 起步，
 * 彻底消灭停留在小节右边沿卡顿以及下一小节跳出 12% 的不连贯现象。
 */
export function getPlayheadBar(bars: Bar[], currentTimeMs: number): Bar | null {
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const beatMs = (bar.endMs - bar.startMs) / (bar.beats || 4);
    const leadMs = beatMs * 0.48;
    const nextBar = bars[i + 1];
    const nextLeadMs = nextBar
      ? ((nextBar.endMs - nextBar.startMs) / (nextBar.beats || 4)) * 0.48
      : leadMs;
    const endWindow = nextBar ? nextBar.startMs - nextLeadMs : bar.endMs - leadMs;
    const startWindow = i === 0 ? bar.startMs - leadMs : undefined;
    if (currentTimeMs < endWindow) {
      if (startWindow !== undefined && currentTimeMs < startWindow) {
        return null;
      }
      return bar;
    }
  }
  return null;
}

interface BlockMetric {
  start: number;
  end: number;
  offsetTop: number;
  offsetHeight: number;
  stride: number;
}

interface ScoreRowBlockProps {
  rowBars: Bar[];
  playheadBarNumber: number | null;
  playheadPercent: number;
  currentTimeMs: number;
  latestHit: HitEvent | null;
  nextHit: HitEvent | null;
  activeWindowMs: number;
  lyrics?: SongDefinition["lyrics"];
  preferTimedLyrics?: boolean;
  lyricOffsetMs?: number;
  charTimes?: Record<number, number[][]>;
  onSeekAndPlay?: (timeMs: number) => void;
  showHands?: boolean;
}

function areRowPropsEqual(prev: ScoreRowBlockProps, next: ScoreRowBlockProps): boolean {
  if (prev.rowBars !== next.rowBars) return false;
  if (prev.onSeekAndPlay !== next.onSeekAndPlay) return false;
  if (prev.showHands !== next.showHands) return false;
  if (prev.charTimes !== next.charTimes) return false;
  if (prev.lyricOffsetMs !== next.lyricOffsetMs) return false;
  if (prev.lyrics !== next.lyrics) return false;
  if (prev.preferTimedLyrics !== next.preferTimedLyrics) return false;
  // Singing can be ahead of/behind its notated bar; don't memoize it by the visual cursor.
  if (!prev.preferTimedLyrics && prev.currentTimeMs !== next.currentTimeMs && prev.rowBars.some(b => b.lyricBeats?.some(Boolean))) return false;

  const rowBars = prev.rowBars;
  const rowStart = rowBars[0].startMs;
  const rowEnd = rowBars[rowBars.length - 1].endMs;

  const prevHasPlayhead = rowBars.some((b) => b.number === prev.playheadBarNumber);
  const nextHasPlayhead = rowBars.some((b) => b.number === next.playheadBarNumber);
  if (prevHasPlayhead || nextHasPlayhead) return false;

  const prevHasLatestHit = prev.latestHit && rowBars.some((b) => b.hits.includes(prev.latestHit!));
  const nextHasLatestHit = next.latestHit && rowBars.some((b) => b.hits.includes(next.latestHit!));
  if (prevHasLatestHit || nextHasLatestHit) return false;

  const prevHasNextHit = prev.nextHit && rowBars.some((b) => b.hits.includes(prev.nextHit!));
  const nextHasNextHit = next.nextHit && rowBars.some((b) => b.hits.includes(next.nextHit!));
  if (prevHasNextHit || nextHasNextHit) return false;

  const firstBar = rowBars[0];
  const beatMs = (firstBar.endMs - firstBar.startMs) / (firstBar.beats || 4);
  const leadMs = beatMs * 0.48;

  const prevPlayheadTime = prev.currentTimeMs + leadMs;
  const nextPlayheadTime = next.currentTimeMs + leadMs;

  const prevPast = prevPlayheadTime >= rowEnd;
  const nextPast = nextPlayheadTime >= rowEnd;
  if (prevPast !== nextPast) return false;

  const prevFuture = prevPlayheadTime < rowStart;
  const nextFuture = nextPlayheadTime < rowStart;
  if (prevFuture !== nextFuture) return false;

  if (prev.lyrics && prev.lyrics.length > 0) {
    const prevInCue = prev.currentTimeMs >= rowStart && prev.currentTimeMs < rowEnd;
    const nextInCue = next.currentTimeMs >= rowStart && next.currentTimeMs < rowEnd;
    if (prevInCue || nextInCue) return false;
    // The first letter may be laid out on the next row while its voice has already begun.
    if (prev.lyrics.some(cue=>cue.startMs<rowEnd && cue.endMs>rowStart &&
      ((prev.currentTimeMs>=cue.startMs && prev.currentTimeMs<cue.endMs) ||
       (next.currentTimeMs>=cue.startMs && next.currentTimeMs<cue.endMs)))) return false;
  }

  return true;
}

const ScoreRowBlock = memo(function ScoreRowBlock({
  rowBars,
  playheadBarNumber,
  playheadPercent,
  currentTimeMs,
  latestHit,
  nextHit,
  activeWindowMs,
  lyrics,
  preferTimedLyrics = false,
  lyricOffsetMs = 0,
  charTimes,
  onSeekAndPlay,
  showHands = true,
}: ScoreRowBlockProps) {
  const rowKey = rowBars[0]?.number ?? 0;
  const rowStart = rowBars[0].startMs;
  const rowEnd = rowBars[rowBars.length - 1].endMs;
  const rowLyrics = lyrics?.filter((cue) => cue.startMs < rowEnd && cue.endMs > rowStart);

  function hitState(hit: HitEvent): "current" | "next" | "idle" {
    if (latestHit === hit && currentTimeMs - hit.atMs <= activeWindowMs) return "current";
    if (nextHit && hit.atMs === nextHit.atMs && nextHit.atMs - currentTimeMs <= 1500) return "next";
    return "idle";
  }

  function strokeChar(hit: HitEvent) {
    const label = strokeLabels[hit.stroke];
    const isSoft = hit.dynamics === "soft";
    const letter = isSoft ? label.letter.toLowerCase() : label.letter;
    return (
      <span
        className={`score-char score-char--${hit.stroke}${isSoft ? " score-char--soft" : ""}`}
        data-hit-at={hit.atMs}
        data-state={hitState(hit)}
        aria-label={`${isSoft ? "轻击 " : ""}${label.name} ${letter}，${hit.hand} 手`}
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
    if (notes.every((note) => !note.hit)) {
      return (
        <div className="score-beat score-beat--rest" key={key}>
          <span className="score-rest" aria-label="休止">
            0
          </span>
        </div>
      );
    }
    const isQuarter = notes.length === 1;
    return (
      <div className="score-beat" key={key}>
        <span
          className={
            isQuarter
              ? "score-group score-group--quarter"
              : `score-group score-group--eighths${notes.some((note) => note.duration === 1) ? " score-group--dense" : ""}${notes.length === 4 ? " score-group--four" : ""}`
          }
        >
          {notes.map((note, index) => (
            <span
              className="score-note"
              key={index}
              data-duration={note.duration === 1 ? "sixteenth" : note.duration === 2 ? "eighth" : "quarter"}
              style={{ flex: note.duration }}
            >
              {note.hit ? (
                strokeChar(note.hit)
              ) : (
                <span className="score-char score-char--rest" aria-label="休止">
                  <b className="score-char__letter">0</b>
                </span>
              )}
            </span>
          ))}
        </span>
      </div>
    );
  }

  return (
    <div className="score-page__block" key={rowKey} data-start={rowStart} data-end={rowEnd}>
      <div className="score-page__row">
        {rowBars.map((bar) => {
          const isActive = playheadBarNumber === bar.number;
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
                  {getCachedBeatPairs(bar).map((pair, index) => beatCell(pair, index))}
                  {isActive && (
                    <div
                      className="score-playhead"
                      style={{
                        left: `${Math.round(playheadPercent * 100) / 100}%`,
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

      {!preferTimedLyrics && rowBars.some((bar) => Boolean(bar.lyric || (bar.lyricBeats && bar.lyricBeats.length > 0))) ? (
        <div className="score-lyrics score-lyrics--bar-aligned" aria-label="本行歌词">
          {rowBars.map((bar) => {
            const isCurrentBar = playheadBarNumber === bar.number;
            const hasBeats = Boolean(bar.lyricBeats && bar.lyricBeats.length > 0);
            const text = bar.lyric ?? "";
            const placed = getCachedPlacedChars(bar, charTimes?.[bar.number], lyricOffsetMs);

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
                  data-state={isCurrentBar && Boolean(text || hasBeats) ? "current" : "idle"}
                  aria-label={text || undefined}
                >
                  {hasBeats && placed ? (
                    <span className="score-lyric__beats score-lyric__beats--placed">
                      {placed.map((c, i) => {
                        let charState: "current" | "past" | "idle" = "idle";
                        if (currentTimeMs >= c.endMs) {
                          charState = "past";
                        } else if (currentTimeMs >= c.startMs) {
                          charState = "current";
                        }

                        return (
                          <span
                            className="score-lyric__char score-lyric__char--placed"
                            key={i}
                            data-state={charState}
                            style={{ left: `${c.leftPercent}%` }}
                          >
                            {c.ch}
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
            const allPositions = characters.map((char, i) => ({
              char,
              at: cue.startMs + (i + 0.5) / characters.length * (cue.endMs - cue.startMs),
            }));
            const positions=allPositions.filter(({ at }) => at >= rowStart && at < rowEnd);
            if (!positions.length) return null;
            const start = Math.max(cue.startMs, rowStart);
            const end = Math.min(cue.endMs, rowEnd);
            const activeStart=positions[0]===allPositions[0] ? cue.startMs : start;
            const activeEnd=positions.at(-1)===allPositions.at(-1) ? cue.endMs : end;
            return (
              <p
                key={cue.startMs}
                className="score-lyric score-lyric--timed"
                data-cue-start={cue.startMs}
                data-cue-end={cue.endMs}
                aria-label={positions.map(({ char }) => char).join("")}
                data-state={currentTimeMs >= activeStart && currentTimeMs < activeEnd ? "current" : "idle"}
                style={{
                  left: `${clamp01((cue.startMs - rowStart) / (rowEnd - rowStart)) * 100}%`,
                  width: `${(Math.min(cue.endMs, rowEnd) - Math.max(cue.startMs, rowStart)) / (rowEnd - rowStart) * 100}%`,
                }}
              >
                {positions.map(({ char, at }, i) => (
                  <span
                    className="score-lyric__char"
                    key={i}
                    style={{ left: `${(at - start) / (end - start) * 100}%` }}
                  >
                    {char}
                  </span>
                ))}
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}, areRowPropsEqual);

export function ScorePage({
  bars,
  currentTimeMs,
  visualLeadMs = 0,
  countInBeat = 0,
  timeSignature,
  bpm,
  lyrics,
  preferTimedLyrics = false,
  lyricOffsetMs = 0,
  charTimes,
  onSeekAndPlay,
  showHands = true,
  isPlaying = false,
}: ScorePageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const visualTimeMs = currentTimeMs + visualLeadMs;
  const timeRef = useRef(visualTimeMs);
  timeRef.current = visualTimeMs;
  const blockMetricsRef = useRef<BlockMetric[]>([]);
  const viewportHeightRef = useRef<number>(0);

  const measureBlocks = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewportHeightRef.current = viewport.clientHeight;
    const blockEls = Array.from(viewport.querySelectorAll<HTMLElement>(".score-page__block"));
    if (!blockEls.length) return;

    const metrics: BlockMetric[] = [];
    for (let i = 0; i < blockEls.length; i++) {
      const el = blockEls[i];
      const nextEl = blockEls[i + 1];
      const prevEl = blockEls[i - 1];
      const offsetTop = el.offsetTop;
      const offsetHeight = el.offsetHeight;
      const stride = nextEl
        ? nextEl.offsetTop - offsetTop
        : prevEl
        ? offsetTop - prevEl.offsetTop
        : offsetHeight;
      metrics.push({
        start: Number(el.dataset.start),
        end: Number(el.dataset.end),
        offsetTop,
        offsetHeight,
        stride,
      });
    }
    blockMetricsRef.current = metrics;
  };

  const follow = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let list = blockMetricsRef.current;
    if (!list.length) {
      measureBlocks();
      list = blockMetricsRef.current;
      if (!list.length) return;
    }
    const time = timeRef.current;
    const found = list.findIndex((m) => time < m.end);
    const index = found < 0 ? list.length - 1 : found;
    const m = list[index];
    const progress = clamp01((time - m.start) / (m.end - m.start));
    const vh = viewportHeightRef.current || viewport.clientHeight;
    viewport.scrollTop = Math.max(
      0,
      m.offsetTop + m.offsetHeight / 2 - vh * 0.4 + (progress - 0.5) * m.stride,
    );
  };

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    measureBlocks();
    follow();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            measureBlocks();
            follow();
          });
    observer?.observe(viewport);
    return () => {
      observer?.disconnect();
    };
  }, [bars]);

  useLayoutEffect(() => {
    follow();
  }, [visualTimeMs]);

  // 计算连续、平滑的播放头所在小节及百分比
  const playheadBar = getPlayheadBar(bars, visualTimeMs);
  const playheadPercent = playheadBar ? getPlayheadPercentInBar(playheadBar, visualTimeMs) : 0;

  // 定位击响音符与下一次击响音符
  const sixteenthMs = bpm ? Math.round(60_000 / bpm / 4) : 125;
  const activeWindowMs = Math.min(140, Math.max(70, Math.round(sixteenthMs * 0.85)));

  const currentAudioBarIdx = bars.findIndex(
    (b) => currentTimeMs >= b.startMs && currentTimeMs < b.endMs,
  );
  const activeHitsWindow = currentAudioBarIdx >= 0
    ? [bars[currentAudioBarIdx - 1], bars[currentAudioBarIdx]].filter(Boolean).flatMap((b) => b.hits)
    : bars.slice(0, 2).flatMap((b) => b.hits);
  const latestHit = activeHitsWindow
    .filter((hit) => hit.atMs <= currentTimeMs && currentTimeMs - hit.atMs <= activeWindowMs)
    .at(-1) ?? null;

  const futureBars = currentAudioBarIdx >= 0
    ? bars.slice(currentAudioBarIdx, currentAudioBarIdx + 3)
    : bars.slice(0, 3);
  const nextHit = futureBars
    .flatMap((b) => b.hits)
    .filter((hit) => hit.atMs > currentTimeMs && hit.atMs - currentTimeMs <= 1500)
    .at(0) ?? null;

  /** 全曲连续排版，每行 3 小节（适配竖屏紧凑与长行视野） */
  const rows = useMemo(() => {
    const r: Bar[][] = [];
    for (let index = 0; index < bars.length; index += 3) {
      r.push(bars.slice(index, index + 3));
    }
    return r;
  }, [bars]);

  return (
    <section className="score" aria-label="可跟练鼓谱">
      <div className="score-legend" aria-hidden="true">
        {bars.some((bar) => bar.hits.some((hit) => hit.dynamics === "soft")) ? (
          <span className="score-meta">小写 b/s：轻击</span>
        ) : null}
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
            <i className="score-hand score-hand--R">R</i>
            <i className="score-hand score-hand--L">L</i>
          </span>
        )}
      </div>

      <div
        className="score-viewport"
        ref={viewportRef}
        tabIndex={0}
        aria-label="连续鼓谱，暂停后可上下滑动"
      >
        <div className="score-page">
          {rows.map((rowBars) => (
            <ScoreRowBlock
              key={rowBars[0]?.number ?? 0}
              rowBars={rowBars}
              playheadBarNumber={playheadBar?.number ?? null}
              playheadPercent={playheadPercent}
              currentTimeMs={currentTimeMs}
              latestHit={latestHit}
              nextHit={nextHit}
              activeWindowMs={activeWindowMs}
              lyrics={lyrics}
              preferTimedLyrics={preferTimedLyrics}
              lyricOffsetMs={lyricOffsetMs}
              charTimes={charTimes}
              onSeekAndPlay={onSeekAndPlay}
              showHands={showHands}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
