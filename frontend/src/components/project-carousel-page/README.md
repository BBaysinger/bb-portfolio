# Project Carousel Integration Notes

This README now tracks integration concerns for the host app layer around the carousel core.

For core internals and package-extraction notes, see `carousel-core/README.md`.

## Scope Of This README

- Route shape and canonical URL strategy for project pages.
- URL/history synchronization between app routing and carousel state.
- Controller-level invariants and manual QA for integration flows.

## Current Direction (2026-04)

- Project routes are full SSG with static params.
- NDA-included routes render sanitized placeholders in static output.
- Core behavior invariants are defined in `carousel-core/README.md` and treated as source of truth.
- In-session navigation should use segment routes (`/project/{slug}/`, `/nda-included/{slug}/`) via client `pushState` so the mounted carousel instance is preserved.
- Routing preference: implement active carousel navigation without query strings when feasible; query strings are acceptable only when they are the only or clearly best option and still preserve mounted-carousel continuity.

## Integration Architecture

Key integration files:

- `ProjectViewWrapper.tsx`
  - hydrates `ProjectData` and bridges SSR to client
  - uses `useProjectUrlSync` to derive `projectId`
- `ProjectView.tsx`
  - owns view composition and route-driven scroll dispatch
  - delegates selection synchronization concerns to `useProjectSelectionController`
- `PageButtons.tsx`
  - prev/next navigation using pushState routing
- `@/hooks/useProjectUrlSync`
  - syncs `projectId` from segment path and listens for external route changes
- `@/hooks/useProjectSelectionController`
  - centralizes carousel stabilization -> URL commit and route-sync guard refs
- `@/utils/navigation`
  - encapsulates pushState/replaceState and dispatches `bb:routechange`

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

- removes "who wins?" ambiguity
- makes Back/Forward naturally correct
- makes buttons and deep links the same operation

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

## Manual QA Checklist

Run this checklist after route-sync or carousel-flow changes:

1. Initial deep link: open `/project/{slug}/` and confirm the carousel lands on that project without a post-load jump.
2. Public prev/next: use controls repeatedly and confirm URL path updates per step and content stays in sync.
3. Public drag/throw: drag across multiple slides and confirm stabilized project matches URL after momentum settles.
4. Public history: use Back/Forward through multiple carousel navigations and confirm slide, URL, and info panel stay aligned.
5. NDA deep link: open `/nda-included/{slug}/` while unauthenticated and confirm sanitized placeholder rendering.
6. NDA history: repeat drag/prev/next/back-forward on NDA route and confirm route base remains `/nda-included/`.
7. Public history: repeat drag/prev/next/back-forward on public route and confirm route base remains `/project/`.
8. Route isolation: confirm NDA placeholders remain placeholders during client interactions and browser focus/visibility changes.
9. Non-remount invariant: during all route changes above, verify carousel transition continuity is uninterrupted.
