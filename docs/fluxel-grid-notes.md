# Fluxel Grid Rendering Notes

_Last updated: 2025-12-08_

## Why This Exists

- Keep a living summary of the Fluxel grid experiments so we can pause/resume without losing context.
- Track the rationale for keeping both the SVG/Canvas implementations and a future PixiJS + shader path for benchmarking.
- Document that the earliest SVG attempt doubled as a React hooks sandbox, so we keep it around for reference even though a production renderer would never lean on React for per-cell drawing.

## Current Rendering Paths

- **SVG (default)**
  - `GridController` chooses this unless `?gridType=canvas` is present.
  - Renders 12×16 = 192 `<FluxelSvg>` nodes + two shadow `<image>` elements per cell, plus overlay `<div>` placeholders.
  - Heavy on React diffing and DOM style recalcs when `gridData` updates.
- **Canvas (feature flag via `?gridType=canvas`)**
  - `FluxelCanvasGrid` redraws the entire bitmap on every state change.
  - Still relies on the same `setGridData` loop, so CPU work stays O(rows × cols).
- **Pixi/WebGL (prototype, currently disabled)**
  - `FluxelPixiGrid.tsx` and `FluxelPixiShadowMesh.ts` hold the unfinished attempt.
  - Goal: move fluxel shading and shadowing into fragment shaders, keep CPU limited to uniform updates.

## Key Bottlenecks Today

- `useFluxelShadows` recomputes influence for every cell at ~20 fps: 960 distance calculations and ~19k square roots per second.
- `setGridData` clones the entire 2D array each frame, triggering React memo compares on every fluxel.
- DOM path creates ~770 nodes (rects, images, overlays) that all participate in layout/paint.
- Canvas path still clears + redraws all cells, so CPU cost scales linearly with grid size.

## Estimated Pixi/Shader Gains

- Collapsing into a single instanced draw call removes the per-cell React+DOM churn (~70–80% lower CPU for the grid effect on desktop).
- Moving influence math into GLSL means we can lift the cap from 20 fps to 60 fps without stutter (≈3× smoother pointer response).
- GPU-side shadow meshes eliminate duplicated `<image>` nodes and CSS overlays, trimming several milliseconds from style/paint during heavy interaction.
- Benefits grow superlinearly if we increase resolution (current approach is O(N); shader path stays near-constant until fill rate limits).

### Pixi vs Straight WebGL

- PixiJS is essentially a convenience layer on top of WebGL. Once the shader work is finished both routes issue the same instanced draw calls, so the meaningful performance win comes from “GPU shaders vs DOM/Canvas,” not “Pixi vs raw WebGL.”
- Raw WebGL might shave a tiny bit of overhead (smaller bundle, direct buffer control), but Pixi accelerates iteration (textures, batching, cleanup) without giving up GPU throughput. Unless we need a fully bespoke render stack, Pixi is the pragmatic choice.

## Must-Keep Requirements

1. **SVG grid stays in repo** for comparison, regression testing, and as a React hooks learning artifact.
2. **Configurable runtime switch** (`gridType=svg|canvas|pixi`) so we can A/B test in prod without redeploying.
3. **Identical `FluxelGridHandle` contract** across renderers so controllers/projectiles don’t need rewrites.

## Long-Term Framework Direction

- **Core engine (WebGL/WebGPU)**: lean TS wrapper that owns instanced buffers, shader modules, pointer/projectile uniforms, and timing. Scene data lives in structured buffers so we can swap renderers later.
- **Effect modules**: pluggable GLSL/WGSL snippets that implement behaviors (magnetic shadows, ripples, projectile hits). Each module defines its uniforms/textures so designers/devs can mix and match.
- **Runtime controller**: handles input routing, animation clocks, scripting hooks, and exposes an imperative API (`applyForce`, `launchProjectile`, `setPalette`). Host frameworks never touch per-cell state.
- **Host adapters**: React/Next, Vue, or plain JS layers that mount a canvas/WebGPU surface, pass config, and subscribe to engine events. No React components per fluxel—only a bridge.
- **Tooling**: built-in perf instrumentation, shader hot reload, preset exporter so this can evolve into a reusable “fluxel effects” toolkit.

## Next Steps When We Resume

1. Instrument current grid (Chrome Performance, `performance.mark` in `useFluxelShadows`) to capture real baseline frame times.
2. Revive `FluxelPixiGrid` using a single instanced geometry buffer (no per-cell containers) and feed pointer uniforms into a fragment shader.
3. Port the shadow math from `useFluxelShadows` into shader space (uniforms: pointer XY, radius, smoothing params).
4. Add a feature flag or query param for Pixi (`?gridType=pixi`) and wire cleanup/disposal so it hot-swaps safely.
5. Compare SVG vs Canvas vs Pixi using the same pointer choreography, record CPU/GPU timelines, and decide which becomes default.

## Status / Reminder To Future Me

- Pausing here until there is dedicated time to finish the Pixi/WebGL pipeline.
- When coming back: revisit these notes, re-run baseline perf captures, then continue with the next steps list above.
- Keep the SVG implementation intact—it documents the early hook-learning experiments and remains useful for regression tests.

## Useful Files

- `frontend/src/components/home-page/header-main/fluxel-grid/FluxelSvgGrid.tsx`
- `frontend/src/components/home-page/header-main/fluxel-grid/FluxelCanvasGrid.tsx`
- `frontend/src/components/home-page/header-main/fluxel-grid/FluxelPixiGrid.tsx`
- `frontend/src/components/home-page/header-main/fluxel-grid/FluxelPixiShadowMesh.ts`
- `frontend/src/components/home-page/header-main/Hero.tsx`

_Feel free to append log entries or measurement summaries here as experiments continue._
