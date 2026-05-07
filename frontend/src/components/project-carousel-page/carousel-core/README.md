# Carousel Core Notes

This document describes the reusable carousel core under `project-carousel-page/carousel-core/`.

## Scope

- Core rendering/scroll behavior and synchronization internals.
- Core contracts intended for package extraction.
- Invariants that must be preserved when refactoring.

For app-level routing/history/controller notes, see `../README.md`.

## Core Invariants

- Non-negotiable invariant: route changes must not remount/rerender the mounted carousel instance in a way that interrupts transitions.
- Non-negotiable invariant: the wrap-cycle offset strategy in `Carousel.tsx` is intentional for infinite continuity and must be preserved.

## Core Architecture

- `Carousel.tsx`
  - owns scroll physics, sizing, wrapping, and stabilization callbacks
- `LayeredCarouselManager.tsx`
  - manages layered carousel synchronization
- `ProjectCarouselView.tsx`
  - composes layered visual carousel devices
- `CarouselTypes.ts`
  - shared source/direction contracts used by host integration
- `DeviceDisplay.tsx`
  - per-device rendering and media-specific display behavior

## Package Extraction Direction

Target: extract `project-carousel-page/carousel-core/` into a standalone npm package.

Working package name (placeholder): `@bb/portfolio-carousel`.

Extraction constraints:

1. Preserve non-remount route-transition continuity.
2. Preserve wrap-cycle offset continuity behavior.
3. Keep route/history integration adapter-based (host app owns URL/history).
4. Minimize the public API surface to stable contracts from `CarouselTypes.ts`.

## Integration Boundary

The core package should not own URL parsing or browser history semantics.

Host app responsibilities:

- parse committed selection from route state
- choose when to `pushState` vs `replaceState`
- map route/dataset semantics (public vs NDA)

Core responsibilities:

- preview motion and stabilized selection signals
- deterministic scroll behavior and loop continuity
- rendering concerns for layered carousel visuals

## Definition of Done (Core)

- Core remains mount-stable while host app route state changes.
- Infinite wrap continuity has no visible seam in either direction.
- Core contracts remain small and adapter-friendly.
- Package consumers can integrate without importing app-specific routing utilities.
