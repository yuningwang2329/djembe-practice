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
  return (
    <fieldset className="track-toggle">
      <button
        type="button"
        className="track-toggle__button"
        aria-label={`${label}音轨`}
        aria-pressed={enabled}
        onClick={() => onEnabledChange(!enabled)}
      >
        <span className="track-toggle__lamp" aria-hidden="true" />
        {label}
        <small>{enabled ? "开启" : "静音"}</small>
      </button>
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
    </fieldset>
  );
}
