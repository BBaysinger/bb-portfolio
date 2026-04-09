# Viewport Hooks

This folder is the seed for a future standalone viewport package.

## Purpose

Provide stable, mobile-friendly viewport measurements for layout code that cannot rely on raw `100vh`, `window.innerHeight`, or one-shot `visualViewport.height` values.

## Exports

- `useStableViewportHeight`
  - returns a stable viewport height in CSS pixels
- `useStableViewportHeightVar`
  - writes that stable height into a CSS custom property on a target element
- `useViewportSettle`
  - schedules a few post-mount and `visualViewport`-driven settle passes

## Design Goals

- Resist mobile browser chrome jitter.
- Prefer real layout changes over transient viewport noise.
- Allow width-driven resizes immediately.
- Allow consumers to opt into selective height-only resize handling.
- Avoid committing top-of-page rubber-band overscroll shrink as the new stable height on coarse-pointer devices.

## Current Strategy

`useStableViewportHeight` keeps a committed stable height and only updates it when the observed viewport change looks trustworthy.

Signals we currently treat as trustworthy enough to commit quickly:

- orientation changes
- sufficiently large width changes
- explicit fullscreen-related transitions
- consumer-approved height-only changes

Signals we currently treat cautiously:

- `visualViewport` jitter during initial mount
- mobile address-bar show/hide noise
- top-of-page pull-down / rubber-band overscroll on touch devices

For the overscroll case, the hook intentionally ignores shrink-only measurements when all of the following are true:

- the device reports a coarse pointer
- the page is effectively at the top
- the new measured height is smaller than the committed stable height
- the browser is not in fullscreen

This prevents a downward pull or flick at the top of the page from permanently shortening the stable viewport height used by layout.

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
