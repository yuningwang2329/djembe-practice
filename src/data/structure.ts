import type { Bar, HitEvent, SongDefinition } from "../domain/song";
import { structureEdits, type StructureEdit } from "./structureEdits";
import { structureEditsStage2 } from "./structureEditsStage2";

/**
 * 谱面结构校正：按 structureEdits 在指定位置补/删小节，使谱面的段落长度
 * 与真实录音一致。
 *
 * 补小节时复刻前一小时的鼓点型；删小节只删生成时已确认不含歌词的位置。
 * 增删后小节重新连续编号，并按各自时长顺次重新计时，词块随所属小节一起移动。
 */
interface BarTemplate {
  beats: number;
  durationMs: number;
  hits: Array<Pick<HitEvent, "stroke" | "hand" | "dynamics"> & { offsetMs: number }>;
  section?: string;
  lyric?: string;
  lyricBeats?: string[];
  timeSignature?: [number, number];
}

function toTemplate(bar: Bar): BarTemplate {
  return {
    beats: bar.beats,
    durationMs: bar.endMs - bar.startMs,
    hits: bar.hits.map((hit) => ({
      offsetMs: hit.atMs - bar.startMs,
      stroke: hit.stroke,
      hand: hit.hand,
      ...(hit.dynamics ? { dynamics: hit.dynamics } : {}),
    })),
    ...(bar.section ? { section: bar.section } : {}),
    ...(bar.lyric ? { lyric: bar.lyric } : {}),
    ...(bar.lyricBeats ? { lyricBeats: bar.lyricBeats } : {}),
    ...(bar.timeSignature ? { timeSignature: bar.timeSignature } : {}),
  };
}

export function applyStructureEdits(song: SongDefinition): SongDefinition {
  // 分两轮：第一轮用原始编号，第二轮用第一轮平移后的编号——增删会改变小节编号，
  // 一轮之内无法表达"删掉一个刚补出来的小节"，所以如实分轮。
  return applyStage(applyStage(song, structureEdits[song.id]), structureEditsStage2[song.id]);
}

function applyStage(song: SongDefinition, edits: StructureEdit[] | undefined): SongDefinition {
  if (!edits?.length || song.bars.length === 0) return song;

  const deletions = new Set<number>();
  for (const edit of edits) {
    for (const target of edit.targets ?? []) deletions.add(target);
  }

  const templates: BarTemplate[] = [];
  for (const bar of song.bars) {
    for (const edit of edits) {
      if (edit.delta > 0 && edit.atBar === bar.number) {
        // 补出来的小节只重复鼓点型，不能带歌词——否则歌词会被复制多份
        const donor = templates.at(-1) ?? toTemplate(bar);
        const filler: BarTemplate = { ...donor };
        delete filler.lyric;
        delete filler.lyricBeats;
        delete filler.section;
        for (let i = 0; i < edit.delta; i += 1) templates.push({ ...filler });
      }
    }
    if (deletions.has(bar.number)) continue;
    templates.push(toTemplate(bar));
  }

  let cursor = song.bars[0].startMs;
  const bars: Bar[] = templates.map((template, index) => {
    const startMs = cursor;
    const endMs = startMs + template.durationMs;
    cursor = endMs;
    return {
      number: index + 1,
      startMs,
      endMs,
      beats: template.beats,
      hits: template.hits.map((hit) => ({
        atMs: startMs + hit.offsetMs,
        stroke: hit.stroke,
        hand: hit.hand,
        ...(hit.dynamics ? { dynamics: hit.dynamics } : {}),
      })),
      ...(template.section ? { section: template.section } : {}),
      ...(template.lyric ? { lyric: template.lyric } : {}),
      ...(template.lyricBeats ? { lyricBeats: template.lyricBeats } : {}),
      ...(template.timeSignature ? { timeSignature: template.timeSignature } : {}),
    };
  });

  return { ...song, bars };
}
