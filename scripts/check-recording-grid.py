"""Check a known beat grid against independent spectral transients.

Input: mono 16-bit PCM WAV, recommended 22050 Hz. Requires numpy.
This measures rhythm, NOT lyric recognition or automatic downbeat detection.
Example: python3 scripts/check-recording-grid.py recording.wav --bpm 118 --start-ms 10610 --end 270
"""
import argparse
import wave
import numpy as np

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("wav")
parser.add_argument("--bpm", required=True, type=float)
parser.add_argument("--start-ms", required=True, type=float)
parser.add_argument("--train-end", default=100, type=float)
parser.add_argument("--end", required=True, type=float)
args = parser.parse_args()
with wave.open(args.wav) as audio:
    if audio.getnchannels() != 1 or audio.getsampwidth() != 2:
        raise ValueError("Expected mono 16-bit PCM WAV")
    sr = audio.getframerate()
    x = np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2") / 32768
frame, hop = 1024, 110
frames = np.lib.stride_tricks.sliding_window_view(x, frame)[::hop]
mag = np.abs(np.fft.rfft(frames * np.hanning(frame), axis=1))
freq = np.fft.rfftfreq(frame, 1 / sr)
t = (np.arange(len(frames)) * hop + frame / 2) / sr
for name, low, high in [("bass", 35, 180), ("high", 1800, 8000)]:
    band = mag[:, (freq >= low) & (freq < high)]
    flux = np.r_[0, np.maximum(0, np.diff(band, axis=0)).sum(axis=1)]
    flux = np.convolve(flux, [.1, .2, .4, .2, .1], mode="same")
    flux = np.minimum(flux / (np.percentile(flux, 95) + 1e-9), 3)
    indexes, peaks = [], []
    count = int((args.end - args.start_ms / 1000) * args.bpm / 60) + 1
    for i in range(count):
        predicted = args.start_ms / 1000 + i * 60 / args.bpm
        ids = np.flatnonzero(abs(t - predicted) < .045)
        if not len(ids):
            continue
        k = ids[np.argmax(flux[ids])]
        if abs(t[k] - predicted) < .035 and flux[k] > .7:
            indexes.append(i)
            peaks.append(t[k])
    indexes, peaks = np.array(indexes), np.array(peaks)
    train = peaks < args.train_end
    if sum(train) < 8:
        raise ValueError("Insufficient training transients; check grid manually")
    slope, offset = np.polyfit(indexes[train], peaks[train], 1)
    train &= abs(peaks - (offset + indexes * slope)) < .015
    slope, offset = np.polyfit(indexes[train], peaks[train], 1)
    print(name, "training BPM", round(60 / slope, 6), "origin ms", round(offset * 1000, 2))
    for label, use in [("training", peaks < args.train_end), ("held-out", peaks >= args.train_end)]:
        if not sum(use):
            print(label, "NO EVIDENCE")
            continue
        residual = (peaks[use] - (args.start_ms / 1000 + indexes[use] * 60 / args.bpm)) * 1000
        print(label, "n", sum(use), "median ms", round(float(np.median(residual)), 2),
              "P90 abs ms", round(float(np.quantile(abs(residual), .9)), 2))
    print("Selection searches only +/-45 ms around a proposed grid: this cannot establish downbeats or rule out an incorrect beat phase.")
