import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScorePage } from "./ScorePage";
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
    // bar 0: startMs 0, endMs 1000, 4 beats. At 500ms (halfway), playhead is exactly at 50%
    const { container } = render(
      <ScorePage bars={song.bars.slice(0, 4)} currentTimeMs={500} />,
    );

    const playhead = container.querySelector(".score-playhead");
    expect(playhead).not.toBeNull();
    expect(playhead).toHaveStyle({ left: "50%" });

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

  it("applies ghost-note soft styling for s and b so they are easily distinguished from S and B", () => {
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
    const { container } = render(<ScorePage bars={[bar]} currentTimeMs={0} />);

    // 强击 S 和 B 没有 soft 类和 ghost-note
    const strongSlap = container.querySelector('[data-hit-at="0"]');
    expect(strongSlap).not.toHaveClass("score-char--soft");
    expect(strongSlap?.querySelector(".score-char__ghost-note")).toBeNull();

    // 弱击 s 和 b 有 soft 类和 ghost-note 装饰环
    const softSlap = container.querySelector('[data-hit-at="500"]');
    expect(softSlap).toHaveClass("score-char--soft");
    expect(softSlap?.querySelector(".score-char__ghost-note")).not.toBeNull();
    expect(softSlap?.textContent).toContain("s");

    const softBass = container.querySelector('[data-hit-at="1500"]');
    expect(softBass).toHaveClass("score-char--soft");
    expect(softBass?.querySelector(".score-char__ghost-note")).not.toBeNull();
    expect(softBass?.textContent).toContain("b");
  });
});
