import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("opens the demo song from the library into landscape practice controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "曲目库" })).toBeInTheDocument();
    expect(screen.getByText("暖身律动")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "开始练习 暖身律动" }));

    expect(screen.getByRole("heading", { name: "暖身律动" })).toBeInTheDocument();
    expect(screen.getByLabelText("可跟练鼓谱")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "原歌曲音轨" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "示范鼓声音轨" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("starts a count-in, changes speed and lets the player pause", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "开始练习 暖身律动" }));

    expect(screen.getByText("1.00×")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "加速" }));
    expect(screen.getByText("1.05×")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "开始播放" }));
    expect(screen.getByText("准备开始 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停播放" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "暂停播放" }));
    expect(screen.getByRole("button", { name: "开始播放" })).toBeInTheDocument();
  });

  it("keeps looping optional and only enables it by an explicit control", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "开始练习 暖身律动" }));

    const loopButton = screen.getByRole("button", { name: "小节循环" });
    expect(loopButton).toHaveAttribute("aria-pressed", "false");
    await user.click(loopButton);
    expect(loopButton).toHaveAttribute("aria-pressed", "true");
  });

  it("switches between score variants for songs that provide them", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "开始练习 桥边姑娘" }));

    const transcribed = screen.getByRole("button", { name: "扒谱版" });
    const textbook = screen.getByRole("button", { name: "教材版" });
    expect(transcribed).toHaveAttribute("aria-pressed", "true");
    expect(textbook).toHaveAttribute("aria-pressed", "false");

    await user.click(textbook);
    expect(textbook).toHaveAttribute("aria-pressed", "true");
    expect(transcribed).toHaveAttribute("aria-pressed", "false");
  });
});
