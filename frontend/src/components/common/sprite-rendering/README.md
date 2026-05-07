# Sprite Renderer Packaging Notes

## Purpose

Capture the current thinking around extracting the sprite renderer into reusable npm packages.

## Current State

The sprite renderer code is already mostly isolated under:

- `frontend/src/components/common/sprite-rendering/`

Contents today:

- `SpriteSheetPlayer.tsx`
- `SpriteSheetPlayer.module.scss`
- `CanvasRenderer.ts`
- `WebGlRenderer.ts`
- `CssRenderer.ts`
- `RenderingAllTypes.ts`

This is already close to a package boundary, but it is not fully publishable as-is.

## React-Specific vs General-Purpose

The overall concept is not very React-specific.

Mostly framework-agnostic pieces:

- `CanvasRenderer.ts`
- `WebGlRenderer.ts`
- `CssRenderer.ts`
- `RenderingAllTypes.ts`

These are browser rendering primitives plus a shared renderer contract.

React-specific pieces:

- `SpriteSheetPlayer.tsx`
- `SpriteSheetPlayer.module.scss`

`SpriteSheetPlayer.tsx` currently combines several responsibilities:

- React lifecycle and DOM refs
- playback orchestration
- renderer selection
- query-param override support
- mount/unmount behavior

The reusable boundary is therefore broader than the current React wrapper.

## Recommended Package Shape

### 1. Core package

This would be the framework-agnostic browser runtime.

Potential responsibilities:

- sprite metadata parsing
- playback controller / frame scheduler
- renderer interface
- CSS renderer
- Canvas renderer
- WebGL renderer
- looping / random-frame / end-frame behavior

Possible package names:

- `sprite-player-core`
- `sprite-sheet-core`
- `sprite-renderer-core`

### 2. React package

This would wrap the core runtime for React apps.

Potential responsibilities:

- React component API
- DOM ref wiring
- effect cleanup
- optional query-param integration
- convenience props for autoplay / frame control

Possible package names:

- `react-sprite-player`
- `react-sprite-sheet-player`

### 3. Query-string utilities package

The current query-param helper probably makes more sense as its own small package
instead of being folded into the sprite packages.

Current in-repo utility:

- `frontend/src/utils/searchParams.ts`

Current responsibilities:

- read a search param from `window.location.search`
- parse a provided search string safely

This could become a small reusable browser utility package that the sprite player
uses, but which is also useful outside sprite rendering.

Possible package names:

- `search-param-utils`
- `url-search-utils`
- `query-string-utils`
- `browser-query-utils`

Preferred option:

- `search-param-utils`

Rationale:

- concise and literal
- broadly reusable across projects
- not tied to React or sprite rendering

## Naming Options

If publishing only a React-facing package:

- `react-sprite-sheet-player`
- `react-sprite-player`
- `sprite-sheet-player`

If publishing a core package plus React wrapper:

- core: `sprite-player-core`
- react: `react-sprite-player`
- query utils: `search-param-utils`

or

- core: `sprite-renderer-core`
- react: `react-sprite-sheet-player`
- query utils: `search-param-utils`

Preferred option:

- core package: `sprite-player-core`
- React wrapper: `react-sprite-player`
- query-string package: `search-param-utils`

Rationale:

- clear division of responsibility
- clear npm naming
- broad enough for non-React consumers later

## Why This Split Makes Sense

With a core/runtime package plus framework adapters, the same underlying renderer system could support:

- vanilla JS
- React
- Preact
- Vue
- Svelte
- custom browser UI shells

That is a better long-term shape than baking the entire concept into a React-only public API.

## Current Couplings To Remove Before Publishing

At least one app-local dependency needs to be removed or replaced:

- `SpriteSheetPlayer.tsx` currently imports `@/utils/searchParams`

That dependency may be best resolved by extracting the current search-param helper
into its own small reusable package instead of moving it into the sprite package.

Likely cleanup work before extraction:

- move sprite metadata parsing into a standalone utility
- separate playback controller logic from the React component
- make query-param overrides optional adapter-level behavior
- decide whether query-string helpers ship as a separate package dependency
- decide whether styling ships as CSS modules, plain CSS, or inline style contracts
- add a public package entrypoint and exports layout

## Future Direction

When revisiting this, prefer extracting the runtime first and treating the React component as an adapter over that runtime.

That should keep the package architecture aligned with the real abstraction boundary rather than the current app integration boundary.

## Remaining Experiments

These are the remaining renderer and performance experiments worth revisiting.

### Renderer Tests

- Canvas path for the fullscreen sequencer with and without DPR caps:
  - `?sequencerRenderStrategy=canvas`
  - `?sequencerRenderStrategy=canvas&sequencerMaxDpr=1`
- Global canvas comparison path:
  - `?spriteRenderStrategy=canvas`
  - `?spriteRenderStrategy=canvas&spriteMaxDpr=1`
- Additional WebGL comparison runs if needed, mainly to keep the test harness honest rather than because WebGL currently looks like the best default.

### Sequencer Work

- Measure whether the new preload/decode warm-up materially improved first-play and between-sequence smoothness.
- Consider keeping one persistent `SpriteSheetPlayer` instance for the sequencer instead of remounting with `animKey` for every new sequence.
- If sequence-start hiccups remain, consider preloading only the most likely next few animations instead of the broader warm-up pass.

### CSS Renderer Work

- Verify whether the recent precomputed-position and duplicate-write skipping changes are measurable in browser profiling.
- If more CSS work is needed, keep it conservative; the CSS renderer is already close to the minimal hot path.

### WebGL Work

- Add `lastFrameIndex` / hidden-state short-circuiting to skip redundant clear+draw passes.
- Precompute frame offsets so the renderer avoids repeated modulo/division work in its draw path.
- Reduce redundant GL state changes only if profiling shows it matters.

### Slinger / Handoff Work

- Verify whether random-frame autoplay starting on a random visible frame fully removed the lightning handoff pause.
- If not, consider an explicit preload/decode warm-up for the lightning sheet, although this may be unnecessary because both players already stay mounted.
