import type { HitEvent, SongDefinition } from "../domain/song";

export interface ScheduleWindow {
  scoreNowMs: number;
  scoreUntilMs: number;
  audioNowSeconds: number;
  playbackRate: number;
}

export interface ScheduledHit {
  id: string;
  hit: HitEvent;
  atAudioTimeSeconds: number;
}

interface ScoreHit extends ScheduledHit {
  scoreAtMs: number;
}

function flattenHits(song: SongDefinition): ScoreHit[] {
  return song.bars.flatMap((bar) =>
    bar.hits.map((hit, hitIndex) => ({
      id: `${bar.number}:${hitIndex}`,
      hit,
      scoreAtMs: hit.atMs,
      atAudioTimeSeconds: 0,
    })),
  );
}

export function createScheduleCursor(song: SongDefinition) {
  const scoreHits = flattenHits(song);
  const scheduledIds = new Set<string>();
  let resetAtMs=0;

  return {
    reset(_scoreTimeMs = 0): void {
      scheduledIds.clear();
      resetAtMs=_scoreTimeMs;
    },

    schedule(window: ScheduleWindow): ScheduledHit[] {
      if (window.scoreUntilMs < window.scoreNowMs || window.playbackRate <= 0) return [];

      return scoreHits.flatMap(({ id, hit, scoreAtMs }) => {
        if (
          scheduledIds.has(id) ||
          scoreAtMs < Math.max(resetAtMs, window.scoreNowMs - 60 * window.playbackRate) ||
          scoreAtMs > window.scoreUntilMs
        ) {
          return [];
        }

        scheduledIds.add(id);
        return [
          {
            id,
            hit,
            atAudioTimeSeconds:
              window.audioNowSeconds +
              Math.max(0, scoreAtMs - window.scoreNowMs) / 1_000 / window.playbackRate,
          },
        ];
      });
    },
  };
}
