import type { Bar, HitEvent } from "../domain/song";
import { strokeLabels } from "../domain/song";

interface ScorePageProps {
  bars: Bar[];
  currentHitAtMs: number | null;
  nextHitAtMs: number | null;
}

interface ScoreSlot {
  hit: HitEvent | null;
  index: number;
}

function makeSlots(bar: Bar): ScoreSlot[] {
  const slotCount = 16;
  const slots: ScoreSlot[] = Array.from({ length: slotCount }, (_, index) => ({ hit: null, index }));
  const duration = bar.endMs - bar.startMs;

  for (const hit of bar.hits) {
    const rawSlot = Math.round(((hit.atMs - bar.startMs) / duration) * slotCount);
    const index = Math.min(slotCount - 1, Math.max(0, rawSlot));
    slots[index] = { hit, index };
  }
  return slots;
}

function hitState(hit: HitEvent, currentHitAtMs: number | null, nextHitAtMs: number | null) {
  if (hit.atMs === currentHitAtMs) return "current";
  if (hit.atMs === nextHitAtMs) return "next";
  return "idle";
}

export function ScorePage({ bars, currentHitAtMs, nextHitAtMs }: ScorePageProps) {
  return (
    <section className="score-page" aria-label="当前四小节鼓谱">
      {bars.map((bar) => (
        <article className="score-bar" key={bar.number} aria-label={`第 ${bar.number} 小节`}>
          <header className="score-bar-header">
            <strong>第 {bar.number} 小节</strong>
            <span>{bar.beats}/4</span>
          </header>
          <div className="score-grid">
            {makeSlots(bar).map(({ hit, index }) => {
              if (!hit) {
                return <div className="score-rest" key={index} aria-label="休止" />;
              }
              const label = strokeLabels[hit.stroke];
              const state = hitState(hit, currentHitAtMs, nextHitAtMs);
              return (
                <div
                  className={`score-hit score-hit--${hit.stroke}`}
                  data-hit-at={hit.atMs}
                  data-state={state}
                  key={index}
                  aria-label={`${label.name} ${label.letter}，${hit.hand} 手`}
                >
                  <span>{label.name} {label.letter}</span>
                  <b>{hit.hand}</b>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}
