import type { Bar, HitEvent, Stroke } from "../domain/song";
import { strokeLabels } from "../domain/song";

interface ScorePageProps {
  bars: Bar[];
  currentTimeMs: number;
  /** 倒数中的拍号（1 起），0 表示不在倒数 */
  countInBeat?: number;
}

interface ScoreSlot {
  hit: HitEvent | null;
  index: number;
}

const ACTIVE_WINDOW_MS = 140;

function makeSlots(bar: Bar): ScoreSlot[] {
  const slotCount = bar.beats * 4;
  const slots: ScoreSlot[] = Array.from({ length: slotCount }, (_, index) => ({ hit: null, index }));
  const duration = bar.endMs - bar.startMs;

  for (const hit of bar.hits) {
    const rawSlot = Math.round(((hit.atMs - bar.startMs) / duration) * slotCount);
    const index = Math.min(slotCount - 1, Math.max(0, rawSlot));
    slots[index] = { hit, index };
  }
  return slots;
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
          <span
            key={index}
            className={countInBeat === index + 1 ? "score-beat--count" : undefined}
          >
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
              {makeSlots(bar).map(({ hit, index }) => {
                if (!hit) return <div className="score-rest" key={index} aria-label="休止" />;
                const label = strokeLabels[hit.stroke];
                return (
                  <div
                    className={`score-note score-note--${hit.stroke}`}
                    data-hit-at={hit.atMs}
                    data-state={hitState(hit)}
                    key={index}
                    aria-label={`第 ${bar.number} 小节 ${label.name} ${label.letter}，${hit.hand} 手`}
                  >
                    <b className="score-note__letter">{label.letter}</b>
                    <span className="score-note__name">{label.name}</span>
                    <i className={`score-hand score-hand--${hit.hand} score-note__hand`}>
                      {hit.hand}
                    </i>
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
