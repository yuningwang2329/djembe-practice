import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScorePage } from "./ScorePage";
import { makeSong } from "../test/fixtures";

describe("ScorePage", () => {
  it("renders four bars with Chinese stroke names, letters and hands", () => {
    const song = makeSong();
    render(<ScorePage bars={song.bars.slice(0, 4)} currentHitAtMs={0} nextHitAtMs={500} />);

    expect(screen.getByText("第 1 小节")).toBeInTheDocument();
    expect(screen.getByText("第 4 小节")).toBeInTheDocument();
    expect(screen.getAllByText("低音 B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("开音 T").length).toBeGreaterThan(0);
    expect(screen.getAllByText("R").length).toBeGreaterThan(0);
    expect(screen.getAllByText("L").length).toBeGreaterThan(0);
  });

  it("marks the current and upcoming hit without marking rests", () => {
    const song = makeSong();
    const { container } = render(
      <ScorePage bars={song.bars.slice(0, 4)} currentHitAtMs={0} nextHitAtMs={500} />,
    );

    expect(container.querySelector('[data-hit-at="0"]')).toHaveAttribute("data-state", "current");
    expect(container.querySelector('[data-hit-at="500"]')).toHaveAttribute("data-state", "next");
    expect(container.querySelector(".score-rest")).not.toHaveAttribute("data-state");
  });
});
