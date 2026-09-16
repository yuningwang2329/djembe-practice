import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScorePage } from "./ScorePage";
import { makeSong } from "../test/fixtures";

describe("ScorePage", () => {
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

  it("sweeps the playhead across the active bar only", () => {
    const song = makeSong();
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

  it("highlights the counted beat during count-in", () => {
    const song = makeSong();
    const { container } = render(
      <ScorePage bars={song.bars.slice(0, 4)} currentTimeMs={0} countInBeat={2} />,
    );

    const counted = container.querySelectorAll(".score-beat--count");
    expect(counted).toHaveLength(1);
    expect(counted[0]).toHaveTextContent("2");
  });
});
