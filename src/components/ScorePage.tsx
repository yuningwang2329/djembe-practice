import type { Bar, HitEvent, Stroke } from "../domain/song";
import { strokeLabels } from "../domain/song";

interface ScorePageProps {
  bars: Bar[];
  currentTimeMs: number;
  /** 倒数中的拍号（1 起），0 表示不在倒数 */
  countInBeat?: number;
}

const ACTIVE_WINDOW_MS = 150;

/**
 * 标准非洲鼓记谱：一小节按拍分组，每拍两个八分音符位置。
 * 两个八分共一条下划线；只有一个音且落在拍头时记为四分音符（不带下划线）；
 * 休止记为 0。多出来的十六分细分按最近的八分位置归并（示例曲全部为八分网格）。
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

export function ScorePage({ bars, currentTimeMs, countInBeat = 0 }: ScorePageProps) {
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

  return (
    <section className="score" aria-label="可跟练鼓谱">
      <div className="score-legend" aria-hidden="true">
        {(["bass", "tone", "slap"] as Stroke[]).map((stroke) => (
          <span key={stroke} className={`score-legend__item score-legend__item--${stroke}`}>
            <b>{strokeLabels[stroke].letter}</b>
            {strokeLabels[stroke].name}
          </span>
        ))}
        <span className="score-legend__hands">
          <i className="score-hand score-hand--R">R</i> 右手
          <i className="score-hand score-hand--L">L</i> 左手
        </span>
      </div>

      <div className="score-beat-row" aria-hidden="true">
        <span className="score-gutter" />
        {Array.from({ length: beatCount }, (_, index) => (
          <span key={index} className={countInBeat === index + 1 ? "score-beat--count" : undefined}>
            {index + 1}
          </span>
        ))}
      </div>

      {bars.map((bar) => {
        const isActive = activeBar?.number === bar.number;
        const progress = clamp01((currentTimeMs - bar.startMs) / (bar.endMs - bar.startMs));
        return (
          <article
            className={isActive ? "score-bar score-bar--active" : "score-bar"}
            key={bar.number}
            aria-label={`第 ${bar.number} 小节`}
          >
            <div className="score-bar__no" aria-hidden="true">{bar.number}</div>
            <div className="score-bar__grid">
              {beatPairs(bar).map((pair, index) => {
                const isQuarter = Boolean(pair.first && !pair.second);
                return (
                  <div className="score-beat" key={index}>
                    <span className={isQuarter ? "score-group score-group--quarter" : "score-group score-group--eighths"}>
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
              })}
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
    </section>
  );
}
