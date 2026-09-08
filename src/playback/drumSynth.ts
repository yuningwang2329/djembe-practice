import type { HitEvent, Stroke } from "../domain/song";

export interface DrumSynth {
  cancel(atAudioTimeSeconds?: number): void;
  getCurrentTime(): number;
  resume(): Promise<void>;
  schedule(hit: HitEvent, atAudioTimeSeconds: number, volume: number): void;
}

const voiceSettings: Record<Stroke, { durationSeconds: number; endFrequency: number; frequency: number }> = {
  bass: { frequency: 110, endFrequency: 58, durationSeconds: 0.22 },
  tone: { frequency: 330, endFrequency: 220, durationSeconds: 0.16 },
  slap: { frequency: 720, endFrequency: 340, durationSeconds: 0.09 },
};

export function createDrumSynth(audioContext: AudioContext): DrumSynth {
  const liveVoices = new Set<OscillatorNode>();

  function removeVoice(voice: OscillatorNode): void {
    liveVoices.delete(voice);
  }

  return {
    getCurrentTime() {
      return audioContext.currentTime;
    },

    async resume() {
      if (audioContext.state === "suspended") await audioContext.resume();
    },

    schedule(hit, atAudioTimeSeconds, volume) {
      if (volume <= 0) return;

      const settings = voiceSettings[hit.stroke];
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startTime = Math.max(audioContext.currentTime, atAudioTimeSeconds);
      const endTime = startTime + settings.durationSeconds;
      const normalizedVolume = Math.min(1, Math.max(0, volume));

      oscillator.type = hit.stroke === "slap" ? "square" : "sine";
      oscillator.frequency.setValueAtTime(settings.frequency, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(settings.endFrequency, endTime);
      gain.gain.setValueAtTime(normalizedVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, endTime);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.onended = () => removeVoice(oscillator);
      liveVoices.add(oscillator);
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.02);
    },

    cancel(atAudioTimeSeconds = audioContext.currentTime) {
      const stopTime = Math.max(audioContext.currentTime, atAudioTimeSeconds);
      for (const voice of liveVoices) {
        try {
          voice.stop(stopTime);
        } catch {
          // A voice may already have ended between scheduling and cancellation.
        }
      }
      liveVoices.clear();
    },
  };
}
