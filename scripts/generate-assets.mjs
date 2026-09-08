import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const SAMPLE_RATE = 22_050;
const DURATION_SECONDS = 32;
const WAV_HEADER_BYTES = 44;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function addVoice(samples, startSample, durationSeconds, frequency, gain, decay, noise = 0) {
  const endSample = Math.min(samples.length, startSample + Math.round(durationSeconds * SAMPLE_RATE));
  let randomState = (startSample + 1) * 1_103_515_245;

  for (let sampleIndex = startSample; sampleIndex < endSample; sampleIndex += 1) {
    const t = (sampleIndex - startSample) / SAMPLE_RATE;
    const envelope = Math.exp(-t * decay) * (1 - Math.min(1, t / durationSeconds));
    randomState = (randomState * 1_664_525 + 1_013_904_223) >>> 0;
    const random = (randomState / 0xffffffff) * 2 - 1;
    samples[sampleIndex] += envelope * (Math.sin(Math.PI * 2 * frequency * t) * gain + random * noise);
  }
}

/**
 * A soft, melodic accompaniment. It deliberately has a different rhythmic and
 * sonic role from the score so the two track toggles remain meaningful.
 */
export function createDemoBackingEvents() {
  const roots = [130.81, 146.83, 164.81, 123.47];
  const chordTones = [1, 1.25, 1.5, 1.25];

  return Array.from({ length: 16 * 4 }, (_, index) => {
    const bar = Math.floor(index / 4);
    const beat = index % 4;
    return {
      atSeconds: bar * 2 + beat * 0.5,
      durationSeconds: 0.44,
      frequency: roots[bar % roots.length] * chordTones[beat],
    };
  });
}

function createDemoGroove() {
  const samples = new Float32Array(SAMPLE_RATE * DURATION_SECONDS);

  for (const event of createDemoBackingEvents()) {
    const startSample = Math.round(event.atSeconds * SAMPLE_RATE);
    addVoice(samples, startSample, event.durationSeconds, event.frequency, 0.13, 4.8, 0.002);
    addVoice(samples, startSample, 0.18, event.frequency * 2, 0.035, 14);
  }

  const wav = Buffer.alloc(WAV_HEADER_BYTES + samples.length * 2);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(samples.length * 2, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index] * 0.82));
    wav.writeInt16LE(Math.round(value * 32_767), WAV_HEADER_BYTES + index * 2);
  }

  return wav;
}

function createCrc32Table() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb8_8320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}

const crc32Table = createCrc32Table();

function crc32(buffer) {
  let value = 0xffff_ffff;
  for (const byte of buffer) {
    value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffff_ffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function createIcon(size) {
  const scanlines = Buffer.alloc((size * 4 + 1) * size);
  const setPixel = (x, y, red, green, blue, alpha = 255) => {
    const offset = y * (size * 4 + 1) + 1 + x * 4;
    scanlines[offset] = red;
    scanlines[offset + 1] = green;
    scanlines[offset + 2] = blue;
    scanlines[offset + 3] = alpha;
  };

  for (let y = 0; y < size; y += 1) {
    scanlines[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;
      const vignette = Math.hypot(nx - 0.5, ny - 0.46);
      let color = vignette > 0.68 ? [220, 196, 163] : [247, 241, 232];

      const head = ((nx - 0.5) / 0.255) ** 2 + ((ny - 0.29) / 0.125) ** 2;
      const innerHead = ((nx - 0.5) / 0.205) ** 2 + ((ny - 0.29) / 0.088) ** 2;
      const neckHalfWidth = 0.13 - Math.max(0, ny - 0.4) * 0.12;
      const inNeck = ny >= 0.37 && ny < 0.68 && Math.abs(nx - 0.5) < neckHalfWidth;
      const bowlHalfWidth = 0.105 + Math.max(0, ny - 0.63) * 0.42;
      const inBowl = ny >= 0.62 && ny < 0.84 && Math.abs(nx - 0.5) < bowlHalfWidth;
      const foot = ny >= 0.83 && ny <= 0.88 && Math.abs(nx - 0.5) < 0.19;

      if (head <= 1) color = [73, 48, 33];
      if (innerHead <= 1) color = [239, 142, 63];
      if (inNeck || inBowl || foot) color = [146, 77, 39];
      if ((inNeck || inBowl) && Math.abs(nx - 0.5) < 0.045) color = [205, 113, 50];
      if (head <= 1 && Math.abs(ny - 0.29) < 0.012 && innerHead > 1) color = [246, 202, 133];
      if ((inNeck || inBowl) && (Math.abs(nx - 0.5) > neckHalfWidth - 0.017 || Math.abs(nx - 0.5) > bowlHalfWidth - 0.017)) {
        color = [78, 49, 32];
      }

      setPixel(x, y, ...color);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function generateAssets(outputDirectory = resolve("public")) {
  const iconsDirectory = resolve(outputDirectory, "icons");
  const audioDirectory = resolve(outputDirectory, "audio");
  await Promise.all([mkdir(iconsDirectory, { recursive: true }), mkdir(audioDirectory, { recursive: true })]);

  await Promise.all([
    writeFile(resolve(iconsDirectory, "apple-touch-icon.png"), createIcon(180)),
    writeFile(resolve(iconsDirectory, "icon-192.png"), createIcon(192)),
    writeFile(resolve(iconsDirectory, "icon-512.png"), createIcon(512)),
    writeFile(resolve(audioDirectory, "demo-groove.wav"), createDemoGroove()),
  ]);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  generateAssets().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
