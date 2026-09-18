import type { Bar, HitEvent, Stroke, SongDefinition } from "../domain/song";
import { strokeLabels } from "../domain/song";

interface ScorePageProps {
  bars: Bar[];
  currentTimeMs: number;
  /** 倒数中的拍号（1 起），0 表示不在倒数 */
  countInBeat?: number;
  /** 拍号（如 4/4）与速度，显示在谱面上方 */
  timeSignature?: [number, number];
  bpm?: number;
  lyrics?: SongDefinition["lyrics"];
}

const ACTIVE_WINDOW_MS = 150;

/**
 * 标准非洲鼓记谱：一页 3 行、每行 4 小节。每小节按拍分组，每拍两个八分音符位置。
 * 独音独占一拍为四分音符（不带下划线）；两个八分紧邻共一条下划线；
 * 空拍只写一个 0；段落（前奏/进唱/副歌…）标在小节左上角；
 * 歌词词组按小节对位（lyricSpan 跨几小节就居中于几小节下方）。
 * 速度参考「阿波非洲鼓」教学谱排版。
 */
interface BeatPair {
  first: HitEvent | null;
  second: HitEvent | null;
}

function beatPairs(bar: Bar): BeatPair[] {
  const eighthMs = (bar.endMs - bar.startMs) / bar.beats / 2;
  const byEighth = new Map<number, HitEvent>();
  for (const hit of bar.hits) {
    const index = Math.round((hit.atMs - bar.startMs) / eighthMs);
    if (index >= 0 && index < bar.beats * 2) byEighth.set(index, hit);
  }
  return Array.from({ length: bar.beats }, (_, beat) => ({
    first: byEighth.get(beat * 2) ?? null,
    second: byEighth.get(beat * 2 + 1) ?? null,
  }));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function ScorePage({
  bars,
  currentTimeMs,
  countInBeat = 0,
  timeSignature,
  bpm,
  lyrics,
}: ScorePageProps) {
  const activeBar =
    bars.find((bar) => currentTimeMs >= bar.startMs && currentTimeMs < bar.endMs) ?? null;
  const nextHit =
    bars
      .flatMap((bar) => bar.hits)
      .filter((hit) => hit.atMs > currentTimeMs)
      .at(0) ?? null;
  const beatCount = bars[0]?.beats ?? 4;

  function hitState(hit: HitEvent): "current" | "next" | "idle" {
    if (Math.abs(currentTimeMs - hit.atMs) <= ACTIVE_WINDOW_MS) return "current";
    if (nextHit && hit.atMs === nextHit.atMs) return "next";
    return "idle";
  }

  function strokeChar(hit: HitEvent) {
    const label = strokeLabels[hit.stroke];
    return (
      <span
        className={`score-char score-char--${hit.stroke}`}
        data-hit-at={hit.atMs}
        data-state={hitState(hit)}
        aria-label={`${label.name} ${label.letter}，${hit.hand} 手`}
      >
        <b className="score-char__letter">{label.letter}</b>
        <i className={`score-hand score-hand--${hit.hand} score-char__hand`}>{hit.hand}</i>
      </span>
    );
  }

  function beatCell(pair: BeatPair, key: number) {
    // 空拍：只写一个 0，不占两个八分格
    if (!pair.first && !pair.second) {
      return (
        <div className="score-beat score-beat--rest" key={key}>
          <span className="score-rest" aria-label="休止">
            0
          </span>
        </div>
      );
    }
    // 独音落在拍头：四分音符，不带下划线
    const isQuarter = Boolean(pair.first && !pair.second);
    return (
      <div className="score-beat" key={key}>
        <span
          className={
            isQuarter ? "score-group score-group--quarter" : "score-group score-group--eighths"
          }
        >
          {pair.first ? (
            strokeChar(pair.first)
          ) : (
            <span className="score-char score-char--rest" aria-label="休止">
              <b className="score-char__letter">0</b>
            </span>
          )}
          {pair.second ? (
            strokeChar(pair.second)
          ) : isQuarter ? null : (
            <span className="score-char score-char--rest" aria-label="休止">
              <b className="score-char__letter">0</b>
            </span>
          )}
        </span>
      </div>
    );
  }

  /** 把一页的小节切成每行 4 小节 */
  const rows: Bar[][] = [];
  for (let index = 0; index < bars.length; index += 4) {
    rows.push(bars.slice(index, index + 4));
  }

  return (
    <section className="score" aria-label="可跟练鼓谱">
      <div className="score-legend" aria-hidden="true">
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
        <span className="score-legend__hands">
          <i className="score-hand score-hand--R">R</i> 右手
          <i className="score-hand score-hand--L">L</i> 左手
        </span>
      </div>

      <div className="score-page">
        {rows.map((rowBars) => {
          const rowKey = rowBars[0]?.number ?? 0;
          const rowStart = rowBars[0].startMs;
          const rowEnd = rowBars[rowBars.length - 1].endMs;
          const rowLyrics = lyrics?.filter((cue) => cue.startMs < rowEnd && cue.endMs > rowStart);
          return (
            <div className="score-page__block" key={rowKey}>
              <div className="score-page__beats" aria-hidden="true">
                <span className="score-gutter" />
                {rowBars.map((bar) => (
                  <div className="score-page__bar-beats" key={`beats-${bar.number}`}>
                    {Array.from({ length: beatCount }, (_, index) => (
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
                  const progress = clamp01(
                    (currentTimeMs - bar.startMs) / (bar.endMs - bar.startMs),
                  );
                  return (
                    <article
                      className={isActive ? "score-bar score-bar--active" : "score-bar"}
                      key={bar.number}
                      aria-label={`第 ${bar.number} 小节`}
                    >
                      {bar.section ? (
                        <span className="score-section" aria-hidden="true">
                          {bar.section}
                        </span>
                      ) : null}
                      <div className="score-bar__no" aria-hidden="true">
                        {bar.number}
                      </div>
                      <div className="score-bar__grid">
                        {beatPairs(bar).map((pair, index) => beatCell(pair, index))}
                        {isActive && (
                          <div
                            className="score-playhead"
                            style={{ left: `${progress * 100}%` }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {lyrics ? (
                <div className="score-lyrics" aria-label="本行歌词">
                  {rowLyrics?.map((cue) => (
                    <p key={cue.startMs} className="score-lyric"
                      data-state={currentTimeMs >= Math.max(cue.startMs, rowStart) && currentTimeMs < Math.min(cue.endMs, rowEnd) ? "current" : "idle"}
                      style={{
                        left: `${clamp01((cue.startMs - rowStart) / (rowEnd - rowStart)) * 100}%`,
                        width: `${(Math.min(cue.endMs, rowEnd) - Math.max(cue.startMs, rowStart)) / (rowEnd - rowStart) * 100}%`,
                      }}>
                      {cue.startMs < rowStart ? "… " : ""}{cue.text}{cue.endMs > rowEnd ? " …" : ""}
                    </p>
                  ))}
                </div>
              ) : rowBars.some((bar) => bar.lyric) && (
                <div className="score-lyrics" aria-hidden="true">
                  {rowBars.map((bar, index) => {
                    if (!bar.lyric) return null;
                    const span = Math.min(bar.lyricSpan ?? 1, rowBars.length - index);
                    return (
                      <p
                        key={`lyric-${bar.number}`}
                        className="score-lyric"
                        style={{
                          left: `${(index / rowBars.length) * 100}%`,
                          width: `${(span / rowBars.length) * 100}%`,
                        }}
                      >
                        {bar.lyric}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
