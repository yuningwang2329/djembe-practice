/**
 * 谱面结构校正 · 第二轮。
 *
 * 第一轮增删之后小节编号整体平移，剩余残差必须用平移后的编号表达，
 * 所以如实分成两轮，各自使用当时的编号。由 tools/sync-fix/remap_edits.py 与
 * plan_structure.py 迭代生成。
 */
import type { StructureEdit } from "./structureEdits";

export const structureEditsStage2: Record<string, StructureEdit[]> = {
  "shuishou": [
    { atBar: 89, delta: -1, targets: [85] },
    { atBar: 94, delta: 1 },
  ],
  "lasa": [
    { atBar: 38, delta: 1 },
    { atBar: 58, delta: -1, targets: [57] },
  ],
};
