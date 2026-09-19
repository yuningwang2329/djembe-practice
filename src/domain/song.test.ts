// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateSong } from "./song";
import { makeSong } from "../test/fixtures";

describe("validateSong", () => {
  it('rejects non-finite, overlapping or out-of-recording lyric cues', () => {
    const song=makeSong();
    song.lyrics=[{text:'甲',startMs:100,endMs:500},{text:'乙',startMs:400,endMs:9000},{text:'丙',startMs:NaN,endMs:600}];
    expect(validateSong(song)).toEqual(expect.arrayContaining(['第 2 句歌词与前一句重叠','第 2 句歌词时间范围无效','第 3 句歌词时间范围无效']));
  });
  it("accepts a complete, ordered score", () => {
    expect(validateSong(makeSong())).toEqual([]);
  });

  it("reports identifiers, timing, hand and stroke errors", () => {
    const invalid = makeSong();
    invalid.id = "";
    invalid.bpm = 0;
    invalid.bars[1].startMs = 500;
    invalid.bars[0].hits[0].hand = "X" as "R";
    invalid.bars[0].hits[1].stroke = "rim" as "tone";

    expect(validateSong(invalid)).toEqual(
      expect.arrayContaining([
        "曲目 id 不能为空",
        "BPM 必须大于 0",
        "第 2 小节与前一小节重叠",
        "第 1 小节第 1 个鼓点左右手无效",
        "第 1 小节第 2 个鼓点音色无效",
      ]),
    );
  });

  it("reports hits that fall outside their bar", () => {
    const invalid = makeSong();
    invalid.bars[0].hits[0].atMs = -1;
    invalid.bars[0].hits[1].atMs = 1_001;

    expect(validateSong(invalid)).toEqual(
      expect.arrayContaining([
        "第 1 小节第 1 个鼓点不在小节范围内",
        "第 1 小节第 2 个鼓点不在小节范围内",
      ]),
    );
  });
});
