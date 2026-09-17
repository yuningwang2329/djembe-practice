import type { Bar, HitEvent, SongDefinition } from "./song";

export interface HitState {
  current: HitEvent | null;
  next: HitEvent | null;
}

export function getBarAtTime(song: SongDefinition, timeMs: number): Bar | null {
  if (song.bars.length === 0) return null;
  const boundedTime = Math.max(song.bars[0].startMs, timeMs);
  return (
    song.bars.find((bar) => boundedTime >= bar.startMs && boundedTime < bar.endMs) ??
    song.bars.at(-1) ??
    null
  );
}

export function getBarPage(song: SongDefinition, activeBarNumber: number, pageSize = 12): Bar[] {
  const activeIndex = Math.max(
    0,
    song.bars.findIndex((bar) => bar.number === activeBarNumber),
  );
  const pageStart = Math.floor(activeIndex / pageSize) * pageSize;
  return song.bars.slice(pageStart, pageStart + pageSize);
}

export function getHitState(
  song: SongDefinition,
  timeMs: number,
  activeWindowMs = 160,
): HitState {
  const hits = song.bars.flatMap((bar) => bar.hits);
  let latest: HitEvent | null = null;
  let next: HitEvent | null = null;

  for (const hit of hits) {
    if (hit.atMs <= timeMs) latest = hit;
    if (hit.atMs > timeMs) {
      next = hit;
      break;
    }
  }

  return {
    current: latest && timeMs - latest.atMs <= activeWindowMs ? latest : null,
    next,
  };
}

export function clampPlaybackRate(rate: number): number {
  const clamped = Math.min(1.5, Math.max(0.5, rate));
  return Math.round(clamped * 20) / 20;
}

export function getLoopSeekTarget(
  timeMs: number,
  loopStartMs: number,
  loopEndMs: number,
): number | null {
  if (loopEndMs <= loopStartMs) return null;
  return timeMs >= loopEndMs ? loopStartMs : null;
}
