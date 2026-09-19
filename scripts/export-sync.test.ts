// Diagnostic export is opt-in; normal test runs never write private files.
import { writeFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import { songLibrary } from '../src/data/demoSong';
test('exports the active catalogue only when explicitly requested', () => {
  expect(songLibrary.length).toBeGreaterThan(1);
  if (process.env.SYNC_EXPORT) writeFileSync(process.env.SYNC_EXPORT, JSON.stringify(songLibrary));
});
