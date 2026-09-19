import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScorePage, isUsableTimes, placedChars } from "./ScorePage";
import { makeSong } from "../test/fixtures";

describe("ScorePage", () => {
  it("keeps all sixteenth hits, their beam lengths, soft letters, and exact seek positions", () => {
    const onSeekAndPlay = vi.fn();
    const bar = { number: 1, startMs: 0, endMs: 2000, beats: 4, hits: [
      { atMs: 0, stroke: "bass" as const, hand: "R" as const },
      { atMs: 250, stroke: "slap" as const, hand: "L" as const, dynamics: "soft" as const },
      { atMs: 375, stroke: "slap" as const, hand: "R" as const, dynamics: "soft" as const },
      { atMs: 500, stroke: "bass" as const, hand: "R" as const, dynamics: "soft" as const },
    ] };
    const { container } = render(<ScorePage bars={[bar]} currentTimeMs={375} onSeekAndPlay={onSeekAndPlay} />);
    expect(container.querySelectorAll('[data-hit-at]')).toHaveLength(4);
    expect([...container.querySelectorAll('.score-char__letter')].map(el => el.textContent).join('')).toBe('Bssb');
    expect(container.querySelectorAll('[data-duration="sixteenth"]')).toHaveLength(2);
    expect(container.querySelectorAll('.score-char[data-state="current"]')).toHaveLength(1);
    expect(container.querySelector('[data-hit-at="500"]')).toHaveAttribute('data-state', 'next');
    fireEvent.click(container.querySelector('[data-hit-at="375"]')!);
    expect(onSeekAndPlay).toHaveBeenLastCalledWith(375);
  });
  it("seeks to a clicked hit without also seeking to its bar, and supports keyboard and blank bar clicks", () => {
    const onSeekAndPlay = vi.fn();
    const { container } = render(<ScorePage bars={makeSong().bars} currentTimeMs={0} onSeekAndPlay={onSeekAndPlay} />);
    fireEvent.click(container.querySelector('[data-hit-at="1500"]')!);
    expect(onSeekAndPlay).toHaveBeenCalledTimes(1);
    expect(onSeekAndPlay).toHaveBeenLastCalledWith(1500);
    fireEvent.click(screen.getByLabelText('第 3 小节'));
    expect(onSeekAndPlay).toHaveBeenLastCalledWith(2000);
    fireEvent.keyDown(container.querySelector('[data-hit-at="1500"]')!, { key: ' ' });
    expect(onSeekAndPlay).toHaveBeenCalledTimes(3);
    expect(onSeekAndPlay).toHaveBeenLastCalledWith(1500);
    fireEvent.keyDown(screen.getByLabelText('第 4 小节'), { key: 'Enter' });
    expect(onSeekAndPlay).toHaveBeenLastCalledWith(3000);
  });
  it("highlights timed lyrics only during their cue and clears them in a gap", () => {
    const props = { bars: makeSong().bars.slice(0, 4), lyrics: [{ startMs: 500, endMs: 1500, text: "测试句子" }] };
    const { rerender } = render(<ScorePage {...props} currentTimeMs={700} />);
    expect(screen.getByLabelText("测试句子")).toHaveAttribute("data-state", "current");
    rerender(<ScorePage {...props} currentTimeMs={1500} />);
    expect(screen.getByLabelText("测试句子")).toHaveAttribute("data-state", "idle");
  });
  it("spreads every character once across a row boundary without ellipses or repeated lyrics", () => {
    const { container } = render(<ScorePage bars={makeSong().bars} currentTimeMs={3100}
      lyrics={[{ startMs: 2000, endMs: 4000, text: "甲乙 丙丁" }]} />);
    const chars = [...container.querySelectorAll('.score-lyric__char')];
    expect(chars.map((char) => char.textContent).join('')).toBe('甲乙丙丁');
    expect(container.querySelectorAll('.score-lyrics')[0].textContent).toBe('甲乙');
    expect(container.querySelectorAll('.score-lyrics')[1].textContent).toBe('丙丁');
    expect(container.querySelectorAll('.score-lyric[data-state="current"]')).toHaveLength(1);
    expect(container.querySelector('.score-page')!.textContent).not.toContain('…');
    expect(chars[0].getAttribute('style')).not.toBe(chars[1].getAttribute('style'));
  });
  it("hides hands when showHands is false", () => {
    const { container } = render(<ScorePage bars={makeSong().bars.slice(0, 3)} currentTimeMs={0} showHands={false} />);
    expect(container.querySelectorAll('.score-hand')).toHaveLength(0);
  });
  it("renders bars as staff rows with a stroke legend", () => {
    const song = makeSong();
    render(<ScorePage bars={song.bars.slice(0, 4)} currentTimeMs={0} />);

    expect(screen.getByLabelText("第 1 小节")).toBeInTheDocument();
    expect(screen.getByLabelText("第 4 小节")).toBeInTheDocument();
    expect(screen.getByText("低音")).toBeInTheDocument();
    expect(screen.getByText("开音")).toBeInTheDocument();
    expect(screen.getAllByText("B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("R").length).toBeGreaterThan(0);
    expect(screen.getAllByText("L").length).toBeGreaterThan(0);
  });

  it("writes quarter notes without underline, pairs eighth notes, and rests as a single 0", () => {
    const song = makeSong();
    const { container } = render(
      <ScorePage bars={song.bars.slice(0, 4)} currentTimeMs={0} />,
    );

    // 测试曲每小节：第 1、3 拍为拍头独音（四分），第 2、4 拍休止
    const quarters = container.querySelectorAll(".score-group--quarter");
    expect(quarters).toHaveLength(8);
    // 休止拍不再写成并列的两个 0，而是单独一个 0
    const rests = container.querySelectorAll(".score-beat--rest .score-rest");
    expect(rests).toHaveLength(8);
    expect(container.querySelectorAll(".score-group--eighths")).toHaveLength(0);
  });

  it("shows meter, tempo, section labels and lyrics when provided", () => {
    const song = makeSong();
    const bars = song.bars.slice(0, 4).map((bar, index) =>
      index === 0 ? { ...bar, section: "前奏", lyric: "测试歌词行" } : bar,
    );
    render(
      <ScorePage
        bars={bars}
        currentTimeMs={0}
        timeSignature={[4, 4]}
        bpm={77.5}
      />,
    );

    expect(screen.getByText("节奏 4/4 · 速度 77.5")).toBeInTheDocument();
    expect(screen.getByText("前奏")).toBeInTheDocument();
    expect(screen.getByText("测试歌词行")).toBeInTheDocument();
  });

  it("marks the sounding hit and the upcoming hit without marking rests", () => {
    const song = makeSong();
    const { container } = render(
      <ScorePage bars={song.bars.slice(0, 4)} currentTimeMs={50} />,
    );

    expect(container.querySelector('[data-hit-at="0"]')).toHaveAttribute("data-state", "current");
    expect(container.querySelector('[data-hit-at="500"]')).toHaveAttribute("data-state", "next");
    expect(container.querySelector(".score-rest")).not.toHaveAttribute("data-state");
  });

  it("moves the playhead at a constant speed across the active bar", () => {
    const song = makeSong();
    // bar 0: startMs 0, endMs 1000, 4 beats. 具备击响提前量 leadMs = beatMs * 0.48 = 120ms，在 500ms 时 playhead 处于 62%
    const { container } = render(
      <ScorePage bars={song.bars.slice(0, 4)} currentTimeMs={500} />,
    );

    const playhead = container.querySelector(".score-playhead");
    expect(playhead).not.toBeNull();
    expect(playhead).toHaveStyle({ left: "62%" });

    const { container: idleContainer } = render(
      <ScorePage bars={song.bars.slice(0, 4)} currentTimeMs={10_000} />,
    );
    expect(idleContainer.querySelector(".score-playhead")).toBeNull();
  });

  it("omits repetitive 1234 beat numbers above bars, leaving only clean bar numbers", () => {
    const song = makeSong();
    const { container } = render(
      <ScorePage bars={song.bars.slice(0, 4)} currentTimeMs={0} countInBeat={2} />,
    );

    // 每小节上方不再有 12341234 拍数列表，保持谱面极度干净
    expect(container.querySelector(".score-page__beats")).toBeNull();
    // 但左上角小节号清晰保留
    expect(container.querySelector(".score-bar__no")).toHaveTextContent("1");
  });

  it("renders a 2/4 time signature badge and flex-2 width for a 2-beat bar without beat numbers", () => {
    const bar24 = {
      number: 5,
      startMs: 4000,
      endMs: 5000,
      beats: 2,
      timeSignature: [2, 4] as [number, number],
      hits: [{ atMs: 4000, stroke: "bass" as const, hand: "R" as const }],
    };
    const { container } = render(
      <ScorePage bars={[bar24]} currentTimeMs={4000} />,
    );

    const meterBadge = container.querySelector(".score-bar__meter");
    expect(meterBadge).not.toBeNull();
    expect(meterBadge).toHaveAttribute("aria-label", "拍号切换 2/4");
    expect(meterBadge!.textContent).toBe("24");

    // 拍头上方不渲染 1234 列表
    expect(container.querySelector(".score-page__bar-beats")).toBeNull();

    const article = container.querySelector(".score-bar");
    expect(article).toHaveStyle({ flex: "2" });
  });

  it("distinguishes soft s/b from strong S/B by the soft class alone — no dashed ring", () => {
    const bar = {
      number: 1,
      startMs: 0,
      endMs: 2000,
      beats: 4,
      hits: [
        { atMs: 0, stroke: "slap" as const, hand: "R" as const },
        { atMs: 500, stroke: "slap" as const, hand: "L" as const, dynamics: "soft" as const },
        { atMs: 1000, stroke: "bass" as const, hand: "R" as const },
        { atMs: 1500, stroke: "bass" as const, hand: "L" as const, dynamics: "soft" as const },
      ],
    };
    const { container } = render(<ScorePage bars={[bar]} currentTimeMs={0} showHands={false} />);

    const strongSlap = container.querySelector('[data-hit-at="0"]');
    expect(strongSlap).not.toHaveClass("score-char--soft");
    expect(strongSlap?.textContent).toBe("S");

    const softSlap = container.querySelector('[data-hit-at="500"]');
    expect(softSlap).toHaveClass("score-char--soft");
    expect(softSlap?.textContent).toBe("s");

    const strongBass = container.querySelector('[data-hit-at="1000"]');
    expect(strongBass).not.toHaveClass("score-char--soft");
    expect(strongBass?.textContent).toBe("B");

    const softBass = container.querySelector('[data-hit-at="1500"]');
    expect(softBass).toHaveClass("score-char--soft");
    expect(softBass?.textContent).toBe("b");

    // 虚线外环已移除：小字+斜体+淡色足够区分，外环在小屏上会糊成一片
    expect(container.querySelector(".score-char__ghost-note")).toBeNull();
  });

  it("逐字时刻原样使用，不再叠加歌词微调（否则是双重补偿）", () => {
    // 逐字时刻来自 CTC 强制对齐，本身就是真实演唱时刻；
    // lyricOffsetMs 是用来修正"按拍位估算"的偏差的，两者都加会把歌词推偏。
    const bar = {
      number: 1,
      startMs: 10_000,
      endMs: 13_000,
      beats: 4,
      hits: [],
      lyricBeats: ["甲乙", "丙", "", "丁"],
    };
    const placed = placedChars(bar, [[10_200, 10_600], [11_100], [], [12_400]]);
    expect(placed?.map((c) => c.startMs)).toEqual([10_200, 10_600, 11_100, 12_400]);
    // 结束时刻接下一个字的起始，呈单调
    expect(placed?.map((c) => c.endMs)).toEqual([10_600, 11_100, 12_400, 12_800]);
  });

  it("isUsableTimes 能够准确识别正常时刻并剔除异常坍缩与压缩伪造数据", () => {
    // 正常递增数据
    expect(isUsableTimes([[1000, 1500], [2000], [2500, 3000]])).toBe(true);

    // 异常：时间倒退
    expect(isUsableTimes([[2000, 1500]])).toBe(false);

    // 异常：连续 ≥ 3 个时刻完全相同（如鼓楼 102-104 小节坍缩）
    expect(isUsableTimes([[230762, 230762], [230762, 240000]])).toBe(false);

    // 异常：连续 ≥ 3 个时刻等差 < 30ms 伪造压缩（如 20ms 退避假数据）
    expect(isUsableTimes([[165790, 165810], [165830, 165850]])).toBe(false);
  });

  it("歌词自适应居中排布并在播放时随播放头实现逐字卡拉OK点亮", () => {
    const bar = {
      number: 1,
      startMs: 0,
      endMs: 2000,
      beats: 4,
      hits: [{ atMs: 500, stroke: "bass" as const, hand: "R" as const }],
      lyricBeats: ["", "暖阳", "下", "我迎"],
    };

    // 在 0ms（空拍待机状态）：所有字均渲染且为 idle
    const { container, rerender } = render(
      <ScorePage bars={[bar]} currentTimeMs={0} />,
    );

    const chars = container.querySelectorAll(".score-lyric__char--placed");
    expect(chars).toHaveLength(5);
    const textList = Array.from(chars).map((c) => c.textContent);
    expect(textList).toEqual(["暖", "阳", "下", "我", "迎"]);

    // 在 400ms（播放头到达第 2 拍第 1 个字）：检查高亮流转
    // beatMs = 500, leadMs = 240, t = 640ms, 位于 "暖" (500~750ms)
    rerender(
      <ScorePage
        bars={[bar]}
        currentTimeMs={400}
      />,
    );

    const nuan = Array.from(chars).find((el) => el.textContent === "暖");
    expect(nuan).toHaveAttribute("data-state", "current");

    // 播放到 600ms 时（t = 840ms），“暖”已扫过变 past，“阳”被扫到变 current
    rerender(
      <ScorePage
        bars={[bar]}
        currentTimeMs={600}
      />,
    );
    expect(nuan).toHaveAttribute("data-state", "past");
    const yang = Array.from(chars).find((el) => el.textContent === "阳");
    expect(yang).toHaveAttribute("data-state", "current");
  });
});
