import type { Bar, HitEvent, SongDefinition } from "../domain/song";

// 马丁非洲鼓教学谱，用户提供。大小写是力度，不是左右手。
// R/L 是右手起拍、拍内交替的建议手序，不声称来自原谱。
// 录音前 10.61 秒为谱外引子；小节 1 从实际鼓组进入处开始。
const BPM = 118;
const START_MS = 10610;
const BEAT_MS = 60000 / BPM;

// 每拍四个十六分位置，“-”延续而不重新击打；“0”整拍休止。
const patterns = {
  basic: ["B---", "S-B-", "B---", "S---"],
  fill: ["B---", "S-B-", "B-SS", "SSB-"],
  chorus: ["B-ss", "S-B-", "B-ss", "S-ss"],
  chorusFill: ["B-S-", "S-ss", "sSBs", "SsBB"],
  stop: ["B---", "0---", "0---", "0---"],
  rest: ["0---", "0---", "0---", "0---"],
  ending: ["B---", "B-b-", "0---", "0---"],
} as const;
type Pattern = keyof typeof patterns;
const specs: Array<{ pattern: Pattern; section?: string }> = [];
function add(pattern: Pattern, count = 1, section?: string) {
  for (let i = 0; i < count; i++) specs.push({ pattern, ...(i === 0 && section ? { section } : {}) });
}
function phrase(pattern: Pattern, fill: Pattern, repeats: number, section: string) {
  for (let i = 0; i < repeats; i++) { add(pattern, 7, i === 0 ? section : undefined); add(fill); }
}
add("basic", 6, "前奏"); add("fill"); add("stop"); // 1–8
phrase("basic", "fill", 2, "主歌一"); // 9–24
phrase("chorus", "chorusFill", 2, "副歌一"); // 25–40
add("chorus", 7, "间奏一"); add("stop"); // 41–48
phrase("basic", "fill", 2, "主歌二"); // 49–64
add("stop", 1, "间奏二"); add("rest", 15); // 65–80
phrase("chorus", "chorusFill", 3, "副歌二"); // 81–104
add("chorus", 6); add("chorusFill"); add("stop"); // 105–112
add("rest", 8, "尾奏·休止"); // 113–120
add("basic", 6, "尾奏"); add("fill"); add("ending"); // 121–128

export const gulouBars: Bar[] = specs.map((spec, index) => {
  const start = START_MS + index * 4 * BEAT_MS;
  const hits: HitEvent[] = [];
  patterns[spec.pattern].forEach((slots, beat) => {
    let handIndex = 0;
    [...slots].forEach((char, slot) => {
      if (char === "-" || char === "0") return;
      hits.push({
        atMs: Math.round(start + (beat + slot / 4) * BEAT_MS),
        stroke: char.toUpperCase() === "B" ? "bass" : "slap",
        hand: handIndex++ % 2 === 0 ? "R" : "L",
        ...(char === char.toLowerCase() ? { dynamics: "soft" as const } : {}),
      });
    });
  });
  return { number: index + 1, startMs: Math.round(start), endMs: Math.round(start + 4 * BEAT_MS), beats: 4, hits,
    ...(spec.section ? { section: spec.section } : {}) };
});

// 用户提供的 LRC 为整秒逐句时间，尚非逐字听校数据。
// 句尾为显示估计，长间奏必须留白，不能延伸到下一次进唱。
const cues: Array<[number, number, string]> = [
  [26, 33, "我走在鼓楼下面 路在堵着"],
  [34, 41, "雨后的阳光洒落 人们都出来了"],
  [42, 49, "执着的迷惘的文艺青年很多"],
  [50, 57, "如果我无聊了就会来这里坐坐"],
  [58, 61, "我是个沉默不语的"],
  [61, 65.5, "靠着墙壁晒太阳的过客"],
  [66, 69, "如果我有些倦意了"],
  [69, 74, "就让我在这里独自醒过"],
  [75, 79, "我站在鼓楼上面"],
  [79, 82.5, "一切繁华与我无关"],
  [83, 90, "这是个拥挤的地方 而我却很平凡"],
  [107, 114, "我走在鼓楼下面 淋湿的咖啡馆"],
  [115, 122, "睡不着的后海边 月亮还在抽着烟"],
  [123, 130, "喝醉的亲吻着 快活的人不眠"],
  [131, 138, "唯有我倚着围栏 对过往说晚安"],
  [172, 175, "我是个沉默不语的"],
  [175, 179.5, "靠着车窗想念你的乘客"],
  [180, 184, "当107 路再次经过"],
  [184, 188.5, "时间是带走青春的电车"],
  [189, 196, "我站在什刹海边一切甜蜜与我无关"],
  [197, 203.5, "这是个拥挤的地方 而我却很孤单"],
  [204, 211, "我在鼓楼 我在鼓楼"],
  [212, 219, "我在鼓楼 我在鼓楼"],
  [224, 231, "我在鼓楼 我在鼓楼"],
];

export const gulou: SongDefinition = {
  id: "gu-lou-zhao-lei", title: "鼓楼", artist: "赵雷", bpm: BPM,
  timeSignature: [4, 4], audioOffsetMs: 0, expectedDurationMs: 281003,
  bars: gulouBars,
  lyrics: cues.map(([start, end, text]) => ({ startMs: start * 1000, endMs: end * 1000, text })),
};
