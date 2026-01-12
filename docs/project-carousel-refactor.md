# Project Carousel Refactor Plan

A design document for simplifying the project carousel + URL sync.

## Goals

- Reduce coupling between:
  - Carousel scroll physics (GSAP + snapping)
  - App “route state” (query/segment/history)
  - Project dataset shape (public vs NDA, placeholders)
- Eliminate one-off coordination flags (e.g., “first stabilization” gates, history markers) where possible.
- Make the dataflow explicit:
  - URL changes should reliably update the carousel.
  - User interaction should reliably update the URL.
- Preserve user-facing behavior:
  - Deep links work.
  - Prev/next buttons work.
  - Back/Forward behavior is stable.
  - NDA/public canonical URL rules remain correct.

## Non-Goals

- Rewriting carousel visuals, slide layout, or GSAP behavior.
- Changing public asset routing (`/projects/*`) or S3 proxy behavior.
- Changing the project dataset model beyond what is necessary for routing/selection.

## Current Architecture (High Level)

Key files:

- `frontend/src/components/project-carousel-page/ProjectViewWrapper.tsx`
  - Hydrates/initializes `ProjectData` and bridges SSR ↔ client.
  - Uses `useProjectUrlSync` to derive `projectId`.
- `frontend/src/hooks/useProjectUrlSync.ts`
  - Syncs `projectId` with `?p=` and listens for external route changes.
- `frontend/src/components/project-carousel-page/ProjectView.tsx`
  - Owns carousel controller logic:
    - route → carousel scroll
    - carousel stabilization → history push
  - Includes coordination guards (e.g., “don’t route→scroll until first stabilization”).
- `frontend/src/components/project-carousel-page/Carousel.tsx`
  - Owns scroll physics/measurement and emits stabilization callbacks.
- `frontend/src/utils/navigation.ts`
  - Encapsulates pushState/replaceState + dispatches `bb:routechange`.

Observed complexity drivers:

- Multiple sources that can “decide” the active project:
  - URL
  - user scroll stabilization
  - initial index
  - dataset re-initializations (NDA access changes)
- Different URL shapes during lifecycle:
  - canonical segment: `/project/{slug}/` or `/nda/{slug}/`
  - in-session query: `/project/?p={slug}` or `/nda/?p={slug}`
- Coordination across timing boundaries:
  - `useLayoutEffect` vs `useEffect`
  - scroll listener attachment timing
  - measuring widths before scrolling

## Simplification Strategy

Adopt an explicit model: **Committed selection vs preview motion**.

- **Committed project ID**: changes only when a user action is committed (carousel stabilization, button click, Back/Forward).
- **Preview motion**: scrolling/dragging can update internal “active index” for rendering, but does not commit URL state.

Then pick a single canonical state representation.

### Recommended Choice: URL is the Canonical Committed State

Principle:

- There is exactly one committed selection: `committedProjectId`.
- That selection is represented in exactly one place: the URL (preferably query `?p=` during session).
- Everything else is derived:
  - Carousel scroll position is driven by `committedProjectId`.
  - Dataset loading is driven by route context (public vs NDA).

Why this helps:

- Removes “who wins?” ambiguity.
- Makes Back/Forward naturally correct.
- Makes buttons and deep links identical operations (write URL).

## Proposed Target Architecture

### 1) A Single “Project Selection Controller” Hook

New hook (example name): `useProjectSelectionController()`

Responsibilities:

- Parse the committed selection from the URL.
- Expose a stable API to *commit* a new selection:
  - `commitProjectId(nextId, { reason, historyMode })`
- Listen for carousel stabilization events and commit to URL.
- Listen for URL changes (including `bb:routechange` and `popstate`) and instruct carousel to scroll.

This hook becomes the only place where URL ↔ carousel synchronization happens.

### 2) Make Carousel Emit Two Signals

Keep the current callbacks, but interpret them clearly:

- `onIndexUpdate` (preview): safe for “active slide” UI; should not cause history writes.
- `onStabilizationUpdate` (commit): the only event that can cause a URL update.

Also add an explicit readiness signal:

- `onReady({ initialIndex })`
  - Fires once after measurement and initial positioning are complete.
  - Used to allow programmatic scroll immediately without needing “didFirstStabilize” style guards.

(If adding `onReady` is undesirable, the existing “initial stabilization” signal can serve this purpose, but it should be emitted reliably during initial positioning.)

### 3) Collapse URL Shapes

Pick one canonical internal navigation scheme.

Recommended:

- During interactive session (carousel/buttons): always use `?p=`.
- For canonical SEO links: segment route remains canonical, but the app does NOT bounce between shapes during normal interaction.

Concretely:

- Canonical link tags still point to `/project/{slug}/` or `/nda/{slug}/`.
- In-session navigation uses `/project/?p={slug}` and `/nda/?p={slug}`.
- Direct hits to segment routes may be normalized once on mount (optional), but this should be implemented in a single place.

### 4) Remove History “Source Markers” Where Possible

Current pattern uses `history.state.source === "carousel"` to suppress feedback loops.

In the target model, feedback loops are avoided by idempotency rules:

- When URL-derived `committedProjectId` equals the currently committed carousel index, do nothing.
- When the carousel stabilizes to the ID already in the URL, do nothing.

You may still want optional metadata in `history.state` for debugging, but it should not be required for correctness.

### 5) Keep Transient User Activation Notes, But Localize Them

`navigateWithPushState` already documents user activation behavior.

In the refactor:

- Only the controller/hook performs push/replace, so it’s the single place to ensure pushes happen inside trusted gestures when needed.
- If Back/Forward coalescing is still a concern, prefer:
  - `replaceState` for internal synchronization,
  - `pushState` only on explicit user actions (button click or stabilization that is known to be within a gesture window).

## Incremental Implementation Plan (2–4 Days)

### Phase 0: Define Invariants (30–60 min)

Write down (in code comments or this doc) the rules that must not change:

- Which routes are valid for public vs NDA.
- When history should create a new entry vs replace.
- What “commit” means (only on stabilization, not during scrolling).
- Which URL shape is used for in-session navigation.

### Phase 1: Centralize URL Parsing + Committing (0.5 day)

- Implement a single parser function:
  - `getCommittedProjectIdFromUrl({ fallbackFromPathSegment })`
- Implement a single writer:
  - `setCommittedProjectIdInUrl(projectId, { mode: 'push' | 'replace' })`
- Replace scattered URL parsing logic in:
  - `useProjectUrlSync`
  - `ProjectView`

At the end of this phase, all URL reads/writes go through one place.

### Phase 2: Introduce `ProjectSelectionController` (0.5–1 day)

- Add `useProjectSelectionController` and move logic from `ProjectView` into it:
  - route → scroll
  - stabilization → URL update
- Remove `lastKnownProjectId`, `routeFromCarousel`, and most history marker handling.
- Keep the existing Carousel + LayeredCarouselManager public APIs.

### Phase 3: Add Explicit Readiness / Remove "First Stabilize" Guard (0.5 day)

- Add `onReady` OR ensure initial stabilization is emitted reliably.
- Remove the “block route-driven scroll until first stabilization” approach.

### Phase 4: Normalize URL Shape Strategy (0.5–1 day)

- Choose whether to normalize segment → query on entry.
- Ensure normalization runs in one place (controller/wrapper) and is idempotent.

### Phase 5: Regression + Cleanup (0.5–1 day)

- Delete now-unused hooks/paths.
- Ensure NDA/public canonical link behavior remains correct.
- Validate:
  - initial load
  - button navigation
  - direct deep links
  - Back/Forward
  - auth flips on NDA route (placeholder ↔ expanded)

## Testing Plan

Minimum Playwright coverage (recommended):

1) Deep link loads correct slide
- Start at `/project/{slug}/` and confirm the correct project is visible.

2) Prev/Next updates committed selection
- Click next, confirm URL changes and carousel updates.

3) Back/Forward stability
- Click next twice, then Back twice; confirm carousel matches URL each time.

4) NDA route boundary
- Ensure public route does not include NDA projects in active navigation.

If adding Playwright is too heavy immediately, create a manual QA checklist and run it before merging.

## Risks / Edge Cases

- Dataset re-initialization changes the list order/contents.
  - Mitigation: treat slide ordering as an explicit input to the controller and keep it stable.
- Resize/measure timing can cause scroll snapping to drift.
  - Mitigation: readiness signal after measurement and a single “position to committed” call.
- User activation window affects history fidelity.
  - Mitigation: push only on explicit click or on stabilization known to run within gesture commit.

## Open Questions

- Do we want to keep segment URLs for canonical/SEO only, or remove query routing entirely?
- Should the session use `pushState` for every stabilization, or `replaceState` unless the user explicitly clicks prev/next?
- Should the controller live in `ProjectViewWrapper` or inside `ProjectView`?

## Definition of Done

- No coordination flags are required for correctness (guards may remain for performance only).
- All URL parsing/writing is centralized.
- One controller owns URL ↔ carousel sync.
- Back/Forward works without relying on "click into carousel first".
- At least minimal automated tests OR a documented manual QA checklist.
