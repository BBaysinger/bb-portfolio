# History, Transient User Activation, and Our Carousel

Why sometimes Back/Forward skipped steps and why it’s good now.

- Browsers treat history.pushState differently depending on whether it happens during a trusted user gesture (click/keydown) — this is called transient user activation.
- When pushState runs within that activation window, Back/Forward usually steps cleanly through each entry. Outside of it, some UAs can coalesce entries, especially around gesture-driven navigation.

What we observed in this app

- Clicking into the carousel counts as a fresh activation. After that, our route updates behave like user-initiated navigations and Back/Forward steps work great.
- The combo we use for robustness:
  - pushState plus a custom `bb:routechange` event
  - hash tokens (e.g., `#ts=…`) to ensure distinct history entries when needed
  - optional double-push fallback (dummy hash push then replace)
  - route-change hook that includes hash and defers across a macrotask + rAF

Where it’s documented in code

- `frontend/src/utils/navigation.ts`: Notes about activation and a dev-only warning when we push without a recent user gesture.
- `frontend/src/components/project-carousel-page/ProjectView.tsx`: Comment near navigation indicating why clicking into the carousel helps.
- `frontend/src/hooks/useRouteChange.ts`: Comment on macrotask + rAF deferral and the role of activation.

If we ever need bulletproof behavior without a prior click

- Fire navigation at the actual gesture commit (e.g., pointerup) in the carousel controller so it’s executed within a trusted user activation.
- Optionally track a recent activation timestamp at app shell (pointerdown/keydown) to improve odds when stabilization callbacks are async.

TL;DR

- If you see Back skipping entries, check where navigation is triggered. Running it inside a real click/keyup fixes it. Clicking into the carousel already provides that activation, which is why it now works “like a dream.”
