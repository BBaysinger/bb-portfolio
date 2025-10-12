# Fluid Responsive System

A JavaScript-powered CSS system for smooth, accessible responsive design without media query jumps.

## Overview

This system combines React hooks with SCSS mixins to create truly fluid responsive scaling that updates in real-time and respects user accessibility preferences.

### Architecture Components

1. **`useFluidVariables` Hook** - Calculates and injects CSS custom properties
2. **`remRange` Mixin** - Text/UI scaling that respects user font size preferences
3. **`staticRange` Mixin** - Layout/visual scaling with consistent pixel precision
4. **`scaleRange` Mixin** - Transform scaling using clamp() for smooth animations

## Quick Start

### 1. Set Up CSS Variables

Add the hook to your layout component:

```tsx
import { useFluidVariables } from "@/hooks/useFluidVariables";

function Layout({ children }) {
  const fluidRef = useFluidVariables([
    [320, 680], // Mobile to tablet
    [680, 1280], // Tablet to desktop
    [320, 1440], // Mobile to large desktop
  ]);

  return <div ref={fluidRef}>{children}</div>;
}
```

### 2. Use SCSS Mixins

```scss
@use "@/styles/mixins" as *;

// Text that scales with user font preferences
.heading {
  @include remRange(font-size, 24px, 48px, 320, 1440);
}

// Layouts that scale with viewport
.container {
  @include staticRange(width, 300px, 1200px, 320, 1440);
  @include staticRange(padding, 16px, 64px, 320, 680);
}

// Smooth transform scaling
.carousel {
  @include scaleRange(0.8, 1.2, 320, 1280, translateX(-50%));
}
```

## How It Works

### JavaScript Layer (useFluidVariables)

The hook calculates responsive progress for each viewport range:

```javascript
// For range [320, 680] at viewport 500px:
const percent = (500 - 320) / (680 - 320) = 0.5

// Sets CSS variable:
element.style.setProperty('--fluid-percent-320-680', '0.5');
```

### SCSS Layer (Mixins)

Mixins use these variables for smooth interpolation:

```scss
// remRange generates (simplified):
font-size: calc(1.5rem + 1.5rem * var(--fluid-percent-320-680));

// staticRange generates:
width: calc(300px + 900px * var(--fluid-percent-320-680));
```

### Real-time Updates

- Recalculates on `resize` and `orientationchange` events
- CSS automatically updates using live variable values
- No re-renders required - pure CSS-driven updates

## Mixin Reference

### `remRange(property, min, max, minVw, maxVw)`

**Purpose**: Accessibility-friendly scaling that respects user font size preferences.

**Use for**: Typography, UI element sizing, spacing around text.

```scss
.text {
  @include remRange(font-size, 16px, 24px, 320, 680);
  @include remRange(line-height, 1.4, 1.6, 320, 680);
  @include remRange(margin, 8px, 16px, 320, 680);
}
```

**Generated CSS**:

```css
.text {
  font-size: calc(1rem + 0.5rem * var(--fluid-percent-320-680));
  line-height: calc(1.4 + 0.2 * var(--fluid-percent-320-680));
  margin: calc(0.5rem + 0.5rem * var(--fluid-percent-320-680));
}
```

### `staticRange(property, min, max, minVw, maxVw)`

**Purpose**: Pixel-precise scaling for layouts and visual elements.

**Use for**: Container widths, grid gaps, visual spacing, component dimensions.

```scss
.layout {
  @include staticRange(width, 300px, 1200px, 320, 1440);
  @include staticRange(gap, 16px, 48px, 320, 1280);
  @include staticRange(border-radius, 4px, 12px, 320, 680);
}
```

**Generated CSS**:

```css
.layout {
  width: 300px;
}

@media screen and (min-width: 320px) {
  .layout {
    width: calc(300px + 900px * var(--fluid-percent-320-1440));
  }
}

@media screen and (min-width: 1440px) {
  .layout {
    width: 1200px;
  }
}
```

### `scaleRange(minScale, maxScale, minVw, maxVw, preserveTransform?)`

**Purpose**: Smooth transform scaling without jumps.

**Use for**: Component scaling, zoom effects, responsive transforms.

```scss
.carousel {
  @include scaleRange(0.8, 1.2, 320, 1280);
}

.centered-modal {
  @include scaleRange(0.9, 1, 320, 768, translateX(-50%) translateY(-50%));
}
```

**Generated CSS**:

```css
.carousel {
  transform: scale(clamp(0.8, 0.8 + 0.4 * ((100vw - 320px) / 960px), 1.2));
}

.centered-modal {
  transform: translateX(-50%) translateY(-50%)
    scale(clamp(0.9, 0.9 + 0.1 * ((100vw - 320px) / 448px), 1));
}
```

## Best Practices

### Choosing the Right Mixin

| Element Type                | Mixin         | Reason                         |
| --------------------------- | ------------- | ------------------------------ |
| Headings, body text, labels | `remRange`    | Respects user font preferences |
| Buttons, form inputs, icons | `remRange`    | Should scale with text         |
| Containers, grids, layouts  | `staticRange` | Consistent visual proportions  |
| Images, videos, graphics    | `staticRange` | Pixel-precise dimensions       |
| Animations, transforms      | `scaleRange`  | Smooth scaling effects         |

### Viewport Ranges

Choose ranges that make sense for your design:

```tsx
const fluidRef = useFluidVariables([
  [320, 480], // Mobile portrait
  [480, 768], // Mobile landscape to tablet
  [768, 1024], // Tablet to small desktop
  [320, 1440], // Full mobile to desktop range
]);
```

### Performance Considerations

- **Limit ranges**: Only include viewport ranges you actually use
- **Consolidate**: Use common ranges across components when possible
- **Cache variables**: The hook automatically handles efficient updates

## Migration Guide

### From Media Queries

**Before**:

```scss
.text {
  font-size: 16px;

  @media (min-width: 768px) {
    font-size: 20px;
  }

  @media (min-width: 1024px) {
    font-size: 24px;
  }
}
```

**After**:

```scss
.text {
  @include remRange(font-size, 16px, 24px, 320, 1024);
}
```

### From clamp()

**Before**:

```scss
.container {
  width: clamp(300px, 50vw, 800px);
}
```

**After**:

```scss
.container {
  @include staticRange(width, 300px, 800px, 320, 1280);
}
```

## Troubleshooting

### Variables Not Working

1. **Check hook setup**: Ensure `useFluidVariables` is called in a parent component
2. **Verify ranges**: Make sure SCSS mixin ranges match hook ranges
3. **Inspect CSS**: Check DevTools for `--fluid-percent-*` variables

### Performance Issues

1. **Reduce ranges**: Limit to necessary viewport breakpoints only
2. **Debounce**: Hook already debounces resize events efficiently
3. **Profile**: Use React DevTools to check for unnecessary re-renders

### Accessibility Concerns

1. **Use remRange for text**: Always use `remRange` for typography
2. **Respect motion preferences**: Consider `prefers-reduced-motion` for animations
3. **Test with zoom**: Verify layout works at 200%+ browser zoom

## Future Library Plans

This system is designed to be extracted into a standalone library with:

- Framework-agnostic JavaScript core
- Plugins for React, Vue, Svelte
- PostCSS plugin for build-time optimization
- TypeScript definitions
- Comprehensive test suite

The current implementation serves as the reference architecture for the future open-source version.
