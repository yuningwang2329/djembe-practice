import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TrackToggle } from "./TrackToggle";

describe("TrackToggle", () => {
  it("changes track enabled state and volume", async () => {
    const user = userEvent.setup();
    const onEnabledChange = vi.fn();
    const onVolumeChange = vi.fn();
    render(
      <TrackToggle
        label="原歌曲"
        enabled
        volume={0.8}
        onEnabledChange={onEnabledChange}
        onVolumeChange={onVolumeChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "原歌曲音轨" }));
    expect(onEnabledChange).toHaveBeenCalledWith(false);

    fireEvent.change(screen.getByLabelText("原歌曲音量"), { target: { value: "0.45" } });
    expect(onVolumeChange).toHaveBeenLastCalledWith(0.45);
  });
});
