interface TrackToggleProps {
  label: string;
  enabled: boolean;
  volume: number;
  onEnabledChange: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
}

export function TrackToggle({
  label,
  enabled,
  volume,
  onEnabledChange,
  onVolumeChange,
}: TrackToggleProps) {
  const icon = label.includes("鼓") ? "🥁" : "🎵";
  const percent = enabled ? `${Math.round(volume * 100)}%` : "静音";

  return (
    <fieldset className="track-toggle">
      <button
        type="button"
        className="track-toggle__button"
        aria-label={`${label}音轨`}
        aria-pressed={enabled}
        onClick={() => onEnabledChange(!enabled)}
      >
        <span className="track-toggle__icon" aria-hidden="true">{icon}</span>
        <span className="track-toggle__lamp" aria-hidden="true" />
        {label}
        <small>{enabled ? "开启" : "静音"}</small>
      </button>
      <div className="track-toggle__slider-wrap">
        <input
          aria-label={`${label}音量`}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          disabled={!enabled}
          onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
        />
        <output className="track-toggle__percent" aria-label={`${label}当前音量`}>{percent}</output>
      </div>
    </fieldset>
  );
}
