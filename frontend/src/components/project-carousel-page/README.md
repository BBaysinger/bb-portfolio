# Project Carousel Notes

This README collects the architecture notes for the project carousel and the browser-history behavior that goes with it.

## Current Direction (2026-04)

- We are refactoring toward SSG-first project routes.
- NDA-included routes should use sanitized placeholders in static data and upgrade client-side when authenticated.
- Non-negotiable invariant: route changes must NOT rerender/remount the carousel in a way that interrupts transitions.
- Non-negotiable invariant: the wrap-cycle offset strategy in `Carousel.tsx` is intentional for infinite continuity and must be preserved.
- In-session navigation should use segment routes (`/project/{slug}/`, `/nda-included/{slug}/`) via client `pushState` so the mounted carousel instance is preserved.
- Routing preference: implement active carousel navigation without query strings when feasible; query strings are acceptable only when they are the only or clearly best option and still preserve mounted-carousel continuity.

## Refactor Goal

Simplify carousel selection, URL synchronization, and history behavior so one controller owns the committed selection state.

## Goals

- Reduce coupling between:
  - carousel scroll physics (GSAP + snapping)
  - app route state (query, segment, history)
  - project dataset shape (public vs NDA, placeholders)
- Eliminate one-off coordination flags where possible.
- Make dataflow explicit:
  - URL changes should reliably update the carousel.
  - User interaction should reliably update the URL.
- Preserve user-facing behavior:
  - deep links work
  - prev/next buttons work
  - Back/Forward behavior is stable
  - NDA/public canonical URL rules remain correct

## Non-Goals

- Rewriting carousel visuals, slide layout, or GSAP behavior.
- Changing public asset routing (`/projects/*`) or S3 proxy behavior.
- Changing the project dataset model beyond what is necessary for routing/selection.

## Current Architecture

Key files:

- `ProjectViewWrapper.tsx`
  - hydrates `ProjectData` and bridges SSR to client
  - uses `useProjectUrlSync` to derive `projectId`
- `ProjectView.tsx`
  - owns view composition and route-driven scroll dispatch
  - delegates selection synchronization concerns to `useProjectSelectionController`
- `Carousel.tsx`
  - owns scroll physics, measurement, and stabilization callbacks
- `LayeredCarouselManager.tsx`
  - manages layered carousel synchronization
- `PageButtons.tsx`
  - prev/next navigation using pushState routing
- `@/hooks/useProjectUrlSync`
  - syncs `projectId` from segment path and listens for external route changes
- `@/hooks/useProjectSelectionController`
  - centralizes carousel stabilization -> URL commit and route-sync guard refs
- `@/utils/navigation`
  - encapsulates pushState/replaceState and dispatches `bb:routechange`

Observed complexity drivers:

- Multiple sources can decide the active project:
  - URL
  - user scroll stabilization
  - initial index
  - dataset re-initialization after NDA access changes
- Different URL shapes during lifecycle:
  - segment route: `/project/{slug}/` or `/nda-included/{slug}/`
  - legacy query routes are compatibility-only redirects
- Coordination across timing boundaries:
  - `useLayoutEffect` vs `useEffect`
  - scroll listener attachment timing
  - width measurement before scrolling

## Recommended Model

Adopt an explicit model: committed selection vs preview motion.

- **Committed project ID** changes only when a user action is committed: carousel stabilization, button click, Back, or Forward.
- **Preview motion** can update internal active index for rendering, but should not commit URL state.

### URL As Canonical Committed State

- There is exactly one committed selection: `committedProjectId`.
- That selection is represented in one place: the URL.
- Everything else derives from it:
  - carousel scroll position from `committedProjectId`
  - dataset loading from route context (public vs NDA)

Why this helps:

- removes “who wins?” ambiguity
- makes Back/Forward naturally correct
- makes buttons and deep links the same operation

## Proposed Target Architecture

### 1. Single project selection controller

Introduce a controller hook such as `useProjectSelectionController()`.

Responsibilities:

- parse committed selection from the URL
- expose `commitProjectId(nextId, { reason, historyMode })`
- listen for carousel stabilization and commit to URL
- listen for URL changes and instruct the carousel to scroll

This becomes the only place where URL ↔ carousel synchronization happens.

### 2. Carousel emits preview vs commit

- `onIndexUpdate` should be preview-only and safe for visual state.
- `onStabilizationUpdate` should be the only event allowed to update history.
- Add an explicit readiness signal such as `onReady({ initialIndex })`, or make initial stabilization reliable enough to serve that role.

### 3. Collapse URL shapes

Recommended:

- in-session navigation uses segment routes
- canonical links point to `/project/{slug}/` or `/nda-included/{slug}/`
- legacy query routes (`?p=`) should redirect and not be used as active navigation state

### 4. Prefer idempotency over history markers

Avoid correctness that depends on history markers like `history.state.source === "carousel"`.

Prefer:

- if URL-derived `committedProjectId` already matches the current carousel commit, do nothing
- if the carousel stabilizes on the ID already in the URL, do nothing

### 5. Keep history behavior localized

Only the controller should perform push/replace operations.

- Use `replaceState` for internal synchronization when appropriate.
- Use `pushState` for explicit user actions.

## Incremental Implementation Plan

### Phase 0. Define invariants

- which routes are valid for public vs NDA
- when history should push vs replace
- what “commit” means
- which URL shape is used for in-session navigation

### Phase 1. Centralize URL parsing and committing (Completed)

- implement `getCommittedProjectIdFromUrl(...)`
- implement `setCommittedProjectIdInUrl(projectId, { mode })`
- replace scattered URL parsing logic

### Phase 2. Introduce selection controller (Completed)

- move route → scroll and stabilization → URL update into a dedicated controller hook
- remove `lastKnownProjectId`, `routeFromCarousel`, and most history marker handling
- keep public Carousel and LayeredCarouselManager APIs stable

### Phase 3. Add explicit readiness (Completed)

- add `onReady`, or make initial stabilization reliable enough to replace first-stabilize guards

### Phase 4. Normalize URL shape strategy (Completed)

- keep segment routes as the only active navigation shape
- keep query-param route handling only as backward-compatible redirects

### Phase 5. Regression cleanup (In Progress)

- delete unused paths
- verify NDA/public canonical behavior
- validate initial load, button navigation, deep links, Back/Forward, and NDA auth flips

## Testing Plan

Minimum recommended coverage:

1. Deep link loads the correct slide.
2. Prev/next updates committed selection.
3. Back/Forward keeps carousel and URL in sync.
4. Public route does not leak NDA projects into active navigation.

## Browser History And User Activation

Why Back/Forward sometimes skipped steps and why it improved:

- Browsers treat `history.pushState` differently depending on whether it happens during a trusted user gesture. This is transient user activation.
- When `pushState` runs inside that activation window, Back/Forward usually steps cleanly through entries.
- Outside it, some browsers can coalesce entries, especially around gesture-driven navigation.

What this app observed:

- Clicking into the carousel counts as a fresh activation.
- After that, route updates behave like user-initiated navigations and Back/Forward works reliably.

Current stabilizers in the app:

- `pushState` plus a custom `bb:routechange` event
- hash tokens like `#ts=...` when distinct entries are needed
- optional double-push fallback in edge cases
- route-change hooks that include hash and defer across a macrotask plus `requestAnimationFrame`

Where this is documented in code:

- `@/utils/navigation`
- `ProjectView.tsx`
- `@/hooks/useRouteChange`

If bulletproof behavior is needed without a prior click:

- fire navigation at the actual gesture commit, such as `pointerup`
- optionally track recent activation timestamps at the app shell layer

## Definition Of Done

- No coordination flags are required for correctness.
- All URL parsing and writing is centralized.
- One controller owns URL ↔ carousel sync.
- Carousel instance remains mounted across route changes during in-session navigation.
- Back/Forward works without relying on “click into carousel first”.
- At least minimal automated coverage or a documented manual QA checklist exists.
