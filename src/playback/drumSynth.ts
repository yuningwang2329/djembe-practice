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
      const normalizedVolume = Math.min(1, Math.max(0, volume)) * (hit.dynamics === "soft" ? 0.45 : 1);

      oscillator.type = hit.stroke === "slap" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(settings.frequency, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(settings.endFrequency, endTime);
      gain.gain.setValueAtTime(normalizedVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, endTime);

      let lastNode: AudioNode = oscillator;
      if (typeof audioContext.createBiquadFilter === "function") {
        const filter = audioContext.createBiquadFilter();
        if (hit.dynamics === "soft") {
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(hit.stroke === "bass" ? 180 : 1000, startTime);
          lastNode.connect(filter);
          lastNode = filter;
        } else if (hit.stroke === "bass") {
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(320, startTime);
          lastNode.connect(filter);
          lastNode = filter;
        } else if (hit.stroke === "slap") {
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(3200, startTime);
          filter.Q.setValueAtTime(1.5, startTime);
          lastNode.connect(filter);
          lastNode = filter;
        }
      }

      lastNode.connect(gain);
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
