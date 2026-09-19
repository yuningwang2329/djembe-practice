/**
 * 谱面结构校正表：让谱面的段落小节数与真实录音一致。
 *
 * 由来：把谱面词块的落点与歌词时间轴对齐后，每个乐句的偏差呈台阶状——
 * 台阶每跳 N 小节，说明谱面在该处比录音少排（跳正）或多排（跳负）了 N 小节。
 * 例如《水手》谱面里有一段 11 小节的间奏，录音中并不存在，导致其后所有歌词晚 30 秒。
 *
 * atBar 前插入 delta 个（复刻前一小节）；targets 列出的原小节号则被删除，
 * 这些位置都已在生成时确认不含歌词。生成脚本：tools/sync-fix/plan_structure.py
 */
export interface StructureEdit {
  /** 在这些小节之前做增删 */
  atBar: number;
  /** 正数=补小节，负数=删小节 */
  delta: number;
  /** delta<0 时，被删除的原始小节号 */
  targets?: number[];
}

export const structureEdits: Record<string, StructureEdit[]> = {
  "qiao-bian-gu-niang": [
    { atBar: 24, delta: -1, targets: [23] },
    { atBar: 34, delta: -1, targets: [33] },
    { atBar: 52, delta: -1, targets: [51] },
  ],
  "tongnian": [
    { atBar: 24, delta: 1 },
    { atBar: 90, delta: 1 },
    { atBar: 102, delta: -1, targets: [101] },
  ],
  "ping-guo-xiang": [
    { atBar: 58, delta: 1 },
  ],
};
