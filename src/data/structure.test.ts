import { describe, expect, it } from "vitest";
import { songLibrary } from "./demoSong";
import { structureEdits } from "./structureEdits";
import { structureEditsStage2 } from "./structureEditsStage2";
import { lyricOffsets } from "./lyricOffsets";
import { lyricCharTimes } from "./lyricCharTimes";
import { validateSong } from "../domain/song";
import { qiaobianguniang } from "./qiaobianguniang";
import { tongnianSong } from "./tongnian";
import { shuishouSong } from "./shuishou";
import { lasaSong } from "./lasa";
import { pingguoxiang } from "./pingguoxiang";
import { beijing } from "./beijing";

/**
 * 结构校正的护栏。曾经因为编辑表用了"文件短名"当键、而运行期查的是 song.id，
 * 导致桥边姑娘和苹果香的校正被静默跳过——所以键必须逐个校验。
 */
describe("谱面结构校正", () => {
  it("编辑表的每个键都能对应到曲目 id", () => {
    const ids = new Set(songLibrary.map((song) => song.id));
    for (const table of [structureEdits, structureEditsStage2]) {
      const orphans = Object.keys(table).filter((key) => !ids.has(key));
      expect(orphans, `这些键没有对应曲目，校正会被静默跳过: ${orphans.join(", ")}`).toEqual([]);
    }
  });

  it("逐字时刻表的每个键能对应到曲目 id，且每小节的词块数对得上", () => {
    const byId = new Map(songLibrary.map((song) => [song.id, song]));
    for (const [id, perBar] of Object.entries(lyricCharTimes)) {
      const song = byId.get(id);
      expect(song, `逐字时刻表里的 ${id} 没有对应曲目，会被静默忽略`).toBeDefined();
      if (!song) continue;
      for (const [barNo, cells] of Object.entries(perBar)) {
        const bar = song.bars.find((b) => b.number === Number(barNo));
        expect(bar, `${id} 第 ${barNo} 小节不存在`).toBeDefined();
        const beats = bar?.lyricBeats?.length ?? 0;
        expect(cells.length, `${id} 第 ${barNo} 小节的词块数对不上`).toBe(beats);
      }
    }
  });

  it("歌词微调表的每个键也能对应到曲目 id", () => {
    const ids = new Set(songLibrary.map((song) => song.id));
    const orphans = Object.keys(lyricOffsets).filter((key) => !ids.has(key));
    expect(orphans, `这些键没有对应曲目，微调会静默失效: ${orphans.join(", ")}`).toEqual([]);
  });

  it("歌词微调量保持在合理范围（不到一小节的一半）", () => {
    for (const song of songLibrary) {
      const offset = lyricOffsets[song.id];
      if (offset === undefined) continue;
      const barMs = Math.max(...song.bars.map((bar) => bar.endMs - bar.startMs));
      expect(Math.abs(offset), `${song.id} 微调量过大，应该改用整小节校正`).toBeLessThan(barMs / 2);
    }
  });

  it("校正后每首曲目的小节编号连续、时间不重叠、鼓点在小节内", () => {
    for (const song of songLibrary) {
      const errors = validateSong(song);
      expect(errors, `${song.id}: ${errors.join("; ")}`).toEqual([]);
    }
  });

  it("校正后小节数等于原始小节数加上净增删量", () => {
    const originals: Record<string, number> = {
      "qiao-bian-gu-niang": qiaobianguniang.bars.length,
      tongnian: tongnianSong.bars.length,
      shuishou: shuishouSong.bars.length,
      lasa: lasaSong.bars.length,
      "ping-guo-xiang": pingguoxiang.bars.length,
      "zhan-zai-cao-yuan-wang-bei-jing": beijing.bars.length,
    };
    for (const song of songLibrary) {
      const base = originals[song.id];
      if (base === undefined) continue;
      const net = [...(structureEdits[song.id] ?? []), ...(structureEditsStage2[song.id] ?? [])]
        .reduce((sum, edit) => sum + edit.delta, 0);
      expect(song.bars.length, `${song.id} 小节数不符`).toBe(base + net);
    }
  });

  it("歌词没有被结构校正弄丢", () => {
    for (const song of songLibrary) {
      const words = song.bars.flatMap((bar) => bar.lyricBeats ?? []).join("").replace(/\s/g, "");
      if (!song.lyrics?.length) continue;
      expect(words.length, `${song.id} 词块全空了`).toBeGreaterThan(0);
    }
  });
});
