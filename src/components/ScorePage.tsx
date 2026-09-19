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
  /** 歌词高亮的整体微调（毫秒）。只动歌词，不动鼓点、播放头或实际播放。 */
  lyricOffsetMs?: number;
  /** 逐字演唱时刻：小节号 -> 与 lyricBeats 等长的数组，每项是该词块内各字的毫秒时刻。 */
  charTimes?: Record<number, number[][]>;
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
 * 5. 变色与竖线播放头严格 1:1 同步：竖线扫过哪个字，哪个字点亮，杜绝竖线未到颜色已跑完的现象。
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

export function placedChars(
  bar: Bar,
  times: number[][] | undefined,
): PlacedChar[] | null {
  return getHumanizedPlacedChars(bar, times, 0);
}

export function getPlayheadPercentInBar(bar: Bar, timeMs: number): number {
  const duration = bar.endMs - bar.startMs;
  if (duration <= 0) return 0;
  const beatMs = duration / (bar.beats || 4);
  // 鼓音字母居中在时值格子中间（约 0.5 拍处）。为了使击响时竖线正好扫过居中音符并快跑过B，
  // 播放头向前超前约半拍
  const leadMs = beatMs * 0.48;
  const t = timeMs + leadMs;
  if (t <= bar.startMs) return 0;
  if (t >= bar.endMs) return 100;
  return clamp01((t - bar.startMs) / duration) * 100;
}

export function ScorePage({
  bars,
  currentTimeMs,
  countInBeat = 0,
  timeSignature,
  bpm,
  lyrics,
  lyricOffsetMs = 0,
  charTimes,
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

  /** 全曲连续排版，每行 3 小节（适配竖屏紧凑与长行视野） */
  const rows: Bar[][] = [];
  for (let index = 0; index < bars.length; index += 3) {
    rows.push(bars.slice(index, index + 3));
  }

  return (
    <section className="score" aria-label="可跟练鼓谱">
      <div className="score-legend" aria-hidden="true">
        {bars.some(bar => bar.hits.some(hit => hit.dynamics === "soft")) ? (
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

      <div className="score-viewport" ref={viewportRef} tabIndex={0} aria-label="连续鼓谱，暂停后可上下滑动">
      <div className="score-page">
        {rows.map((rowBars) => {
          const rowKey = rowBars[0]?.number ?? 0;
          const rowStart = rowBars[0].startMs;
          const rowEnd = rowBars[rowBars.length - 1].endMs;
          const rowLyrics = lyrics?.filter((cue) => cue.startMs < rowEnd && cue.endMs > rowStart);
          return (
            <div className="score-page__block" key={rowKey} data-start={rowStart} data-end={rowEnd}>
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
                    const placed = getHumanizedPlacedChars(bar, charTimes?.[bar.number], lyricOffsetMs);

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
                          {hasBeats && placed ? (
                            <span className="score-lyric__beats score-lyric__beats--placed">
                              {placed.map((c, i) => {
                                let charState: "current" | "past" | "idle" = "idle";
                                if (currentTimeMs >= bar.endMs) {
                                  charState = "past";
                                } else if (currentTimeMs < bar.startMs) {
                                  charState = "idle";
                                } else if (isCurrent) {
                                  const playheadPercent = getPlayheadPercentInBar(bar, currentTimeMs);
                                  if (playheadPercent >= c.endPercent) {
                                    charState = "past";
                                  } else if (playheadPercent >= c.startPercent) {
                                    charState = "current";
                                  } else {
                                    charState = "idle";
                                  }
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
