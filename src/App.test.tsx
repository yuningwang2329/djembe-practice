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

  it("opens 桥边姑娘 with the official score: sections, lyrics and tempo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "开始练习 桥边姑娘" }));

    expect(screen.getByText("前奏")).toBeInTheDocument();
    expect(screen.getByText("节奏 4/4 · 速度 77.329")).toBeInTheDocument();
    // 一行四小节，当前播放头落在第 1 小节
    expect(screen.getByLabelText("第 1 小节")).toBeInTheDocument();
    expect(screen.getByLabelText("第 4 小节")).toBeInTheDocument();
  });
});
