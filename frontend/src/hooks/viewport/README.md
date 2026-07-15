# Viewport Hooks

This folder is the seed for a future standalone viewport package.

## Purpose

Provide stable, mobile-friendly viewport measurements for layout code that cannot rely on raw `100vh`, `window.innerHeight`, or one-shot `visualViewport.height` values.

## Exports

- `useViewportSize`
  - returns `{ width, height }` for the current viewport and refreshes after resize/orientation/settle passes
- `useStableViewportHeight`
  - returns a stable viewport height in CSS pixels
- `useStableViewportHeightVar`
  - writes that stable height into a CSS custom property on a target element
- `useViewportSettle`
  - schedules a few post-mount and `visualViewport`-driven settle passes
- `useLockedStableViewportHeightVar`
  - captures mobile short/long viewport heights once per orientation
  - exposes global `--short-vh`, `--long-vh`, and active `--stable-vh` variables on the document root
  - on mobile Chrome, `--stable-vh` may use the visible long height after routing until the first real user scroll; other mobile browsers keep the short height locked

## Design Goals

- Resist mobile browser chrome jitter.
- Prefer real layout changes over transient viewport noise.
- Allow width-driven resizes immediately.
- Allow consumers to opt into selective height-only resize handling.
- Avoid committing top-of-page rubber-band overscroll shrink as the new stable height on coarse-pointer devices.

## Current Status

This hook remains in the codebase primarily because Firefox, Edge, and Opera had browser-specific cases where CSS `svh` was not stable enough in real testing.

For now, the JS-managed path is only intended for Firefox, Edge, and Opera when consumers opt into `use-where-required`. Other mobile browsers can still distort page height during downward pull-to-refresh gestures, and this hook does not fully solve that case yet. That gap is acceptable for now because the default mode stays on CSS `svh`, and current testing has not shown the same downward-gesture viewport mutation issue in the browsers currently routed to the managed path.

## Current Strategy

Browser-specific gating for the JS-managed stable-height path lives in [stableViewportHeightPolicy.ts](stableViewportHeightPolicy.ts), keeping detection/policy separate from the measurement hook itself.

`useStableViewportHeight` keeps a committed stable height and only updates it when the observed viewport change looks trustworthy.

Signals we currently treat as trustworthy enough to commit quickly:

- orientation changes
- sufficiently large width changes
- explicit fullscreen-related transitions
- consumer-approved height-only changes

For explicit orientation changes, large width flips, and fullscreen transitions, the hook opens a short forced-commit window so the follow-up settled measurement is not blocked by the same coarse-pointer top-of-page guards that exist to filter toolbar and overscroll noise.

Signals we currently treat cautiously:

- `visualViewport` jitter during initial mount
- mobile address-bar show/hide noise
- top-of-page pull-down / rubber-band overscroll on touch devices
- pull-to-refresh reload recoil while the visual viewport is still offset downward
- touch-device samples captured while the page is meaningfully scrolled, because they often reflect the toolbar-minimized viewport rather than the top-of-page layout state
- top-of-page touch-device growth samples, because Mobile Safari can briefly report the collapsed-toolbar viewport during route return before the chrome expands again

For Opera specifically, the managed path does not currently treat `visualViewport` scroll events as trustworthy settle signals, and it also refuses height-only resize commits. Opera was still shifting hero-sized layouts while scrolling even after being routed to the JS-managed height path, so that browser now responds only to stronger signals like width changes, orientation changes, fullscreen transitions, and explicit settle passes.

For the overscroll case, the hook intentionally ignores shrink-only measurements when all of the following are true:

- the device reports a coarse pointer
- the page is effectively at the top
- the new measured height is smaller than the committed stable height
- the browser is not in fullscreen

This prevents a downward pull or flick at the top of the page from permanently shortening the stable viewport height used by layout.

If the page mounts while the visual viewport is still displaced downward, the hook also refuses to seed from that sample and waits for the post-mount settle passes instead. This covers pull-to-refresh reloads where the first measurement can happen during recoil from the reload gesture.

On coarse-pointer devices, the hook also avoids committing viewport-height samples captured while the page is still meaningfully scrolled. This keeps a route return from seeding the stable height from Mobile Safari's temporarily taller, toolbar-minimized viewport.

When the page is effectively at the top on a coarse-pointer device, the hook also seeds from the smallest currently available viewport candidate and ignores later top-of-page height growth. This keeps hero-sized layouts anchored to the expanded-chrome viewport instead of the temporarily taller collapsed-toolbar viewport.

To avoid getting stuck on a slightly too-tall committed value, the hook also allows a small shrink correction shortly after mount or after a recent accepted height increase. This covers cases where Mobile Safari briefly reports the larger scrolled-page viewport during route return before the browser chrome settles back in.

The implementation also rejects non-finite or non-positive measurements and falls back through multiple browser-provided height sources before returning `0`. This keeps a bad first sample from poisoning the committed CSS variable.

## Why Not A Generic `100vh` Package

Most existing npm packages in this space are older `100vh` shims or CSS variable helpers. Those help with classic address-bar issues, but they do not usually model modern `visualViewport` behavior or distinguish transient overscroll from real layout changes.

This implementation exists because the app needs a stricter notion of “stable” than those packages usually provide.

## Packaging Notes

If this becomes its own npm package, keep these constraints explicit in the public API and README:

- what counts as a stable change
- which events trigger settle passes
- how coarse-pointer overscroll is handled
- which behaviors are defaults versus opt-in policies
