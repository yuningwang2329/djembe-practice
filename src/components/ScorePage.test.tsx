import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScorePage } from "./ScorePage";
import { makeSong } from "../test/fixtures";

describe("ScorePage", () => {
  it("renders bars as timeline rows with stroke letters, names and hands", () => {
    const song = makeSong();
    render(<ScorePage bars={song.bars.slice(0, 4)} currentTimeMs={0} />);

    expect(screen.getByLabelText("第 1 小节")).toBeInTheDocument();
    expect(screen.getByLabelText("第 4 小节")).toBeInTheDocument();
    expect(screen.getAllByText("低音").length).toBeGreaterThan(0);
    expect(screen.getAllByText("开音").length).toBeGreaterThan(0);
    expect(screen.getAllByText("B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("R").length).toBeGreaterThan(0);
    expect(screen.getAllByText("L").length).toBeGreaterThan(0);
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
