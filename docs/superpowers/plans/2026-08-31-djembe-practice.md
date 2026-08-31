# iPad Djembe Practice PWA Implementation Plan

> **For agentic workers:** Implement inline task-by-task with strict red-green-refactor. Every behavior change begins with a failing Vitest or Playwright test.

**Goal:** Build an installable, offline-capable iPad landscape djembe practice PWA with score following, independent song/drum tracks, speed, looping, count-in, local audio import, and wake lock.

**Architecture:** React renders a library and practice surface. Pure domain modules validate score data and derive active bars/hits. A playback controller uses the media element as master time, schedules synthesized drum hits through Web Audio, and exposes state to React. IndexedDB stores user audio while vite-plugin-pwa precaches the app shell and built-in demo.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, fake-indexeddb, Playwright, vite-plugin-pwa, native CSS.

## Global Constraints

- iPad Safari landscape is primary; portrait remains usable.
- Real commercial audio never enters Git or the public build.
- UI labels use Chinese plus B/T/S and R/L.
- Playback rate is 0.5x to 1.5x in 0.05 increments.
- Four bars appear per landscape page.
- Imported audio is local-only and survives normal app restarts.

---

### Task 1: Domain model and timing derivations

**Files:** `src/domain/song.ts`, `src/domain/timeline.ts`, `src/data/demoSong.ts`, `src/domain/*.test.ts`

**Produces:** validated `SongDefinition`, `getBarAtTime`, `getHitState`, `getBarPage`, rate clamp, and loop-boundary helpers.

- [ ] Write tests for valid/invalid scores, bar lookup, current/next hit, four-bar pages, rate limits, and loop seeking.
- [ ] Run `npm test -- --run src/domain` and confirm missing-module failures.
- [ ] Add the smallest pure implementations and demo-song generator that make tests pass.
- [ ] Re-run the domain tests and refactor only while green.

### Task 2: Local audio repository

**Files:** `src/storage/audioRepository.ts`, `src/storage/audioRepository.test.ts`, `src/storage/storageStatus.ts`

**Produces:** `saveAudio`, `getAudio`, `deleteAudio`, `listAudioMetadata`, quota/persistence helpers, and import validation.

- [ ] Write fake-indexeddb tests for save/read/replace/delete, MIME rejection, duration mismatch, and retained old audio on failed writes.
- [ ] Run the targeted test and confirm expected failures.
- [ ] Implement IndexedDB schema version 1 and validation.
- [ ] Run storage tests until green.

### Task 3: Playback controller and drum synthesis

**Files:** `src/playback/clock.ts`, `src/playback/scheduler.ts`, `src/playback/drumSynth.ts`, `src/playback/*.test.ts`

**Produces:** master-clock adapter, look-ahead event selection, loop decisions, count-in state, and cancellable drum voices.

- [ ] Test scheduling windows, deduplication, rate conversion, seek reset, loop reset, and muted-track behavior with real pure functions.
- [ ] Verify the tests fail for missing behavior.
- [ ] Implement pure scheduler logic, then the browser adapters.
- [ ] Keep all scheduler tests green before integrating React.

### Task 4: Library and practice UI

**Files:** `src/App.tsx`, `src/components/*`, `src/styles.css`, `src/App.test.tsx`

**Produces:** library, import/remove workflow, four-bar score, controls, storage status, errors, portrait notice, and touch-safe layout.

- [ ] Write component tests for library states, navigation, import errors, independent track switches, speed controls, looping, and score labels.
- [ ] Confirm targeted tests fail.
- [ ] Implement the minimum UI and state hooks needed for each test.
- [ ] Add accessible labels, focus styles, reduced motion, and responsive CSS while keeping tests green.

### Task 5: PWA, demo audio, and wake lock

**Files:** `vite.config.ts`, `src/pwa.ts`, `src/hooks/useWakeLock.ts`, `public/icons/*`, `public/audio/demo.wav`, related tests.

**Produces:** installable manifest, app-shell precache, update prompt, offline sample, generated icons, and playback-scoped wake lock.

- [ ] Add tests for wake-lock acquire/release/reacquire and update-state UI.
- [ ] Confirm failures, then implement the hook and update flow.
- [ ] Generate deterministic original practice backing audio and icons from repository scripts.
- [ ] Build and inspect the emitted manifest and service worker assets.

### Task 6: End-to-end verification and delivery

**Files:** `playwright.config.ts`, `e2e/*.spec.ts`, `README.md`, `.gitignore`, output ZIP.

**Produces:** automated iPad landscape/portrait and offline checks, usage guide, and self-contained package.

- [ ] Write Playwright tests for the library-to-practice path, track controls, four-bar paging, portrait notice, install assets, and offline reload.
- [ ] Run tests and fix only product defects proven by failures.
- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` from a clean production build.
- [ ] Inspect the final Git status and exclude all user/commercial audio patterns.
- [ ] Create a ZIP from the verified source, excluding `.git`, `node_modules`, and transient reports.

## Execution Handoff

The user explicitly selected inline execution by asking to implement the approved plan in this session. No subagent dispatch is required.
