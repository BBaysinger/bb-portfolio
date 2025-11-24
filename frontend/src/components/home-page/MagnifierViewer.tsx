"use client";

import React, {
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";

export interface ViewerItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
}

/**
 * MagnifierViewer
 *
 * Next.js/React component:
 * - Vertical scrollable list of mini cards in a zig-zag path.
 * - A fixed magnifier overlay in the center shows a full-size, readable card
 *   for whichever mini card is closest to the vertical center of the scroll area.
 *
 * Notes:
 * - Pure client component (`"use client";`).
 * - Uses scroll snapping on the Y axis for natural stopping points.
 * - Uses requestAnimationFrame to keep the active index tightly in sync
 *   with scroll position.
 * - Styles are injected via a <style> tag for easy drop-in testing; you can
 *   move them into your SCSS/CSS pipeline later.
 */
export const MagnifierViewer: FC<{ items: ViewerItem[] }> = ({ items }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Ensure refs array matches item length
  if (itemRefs.current.length !== items.length) {
    itemRefs.current = Array(items.length)
      .fill(null)
      .map((_, i) => itemRefs.current[i] || null);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frameId: number | null = null;
    let running = true;

    const updateActiveIndex = () => {
      if (!running) return;
      const rectContainer = container.getBoundingClientRect();
      const centerY = rectContainer.top + rectContainer.height / 2;

      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < itemRefs.current.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const itemCenterY = rect.top + rect.height / 2;
        const distance = Math.abs(itemCenterY - centerY);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }

      setActiveIndex((prev) => (prev === closestIndex ? prev : closestIndex));
      frameId = window.requestAnimationFrame(updateActiveIndex);
    };

    frameId = window.requestAnimationFrame(updateActiveIndex);

    return () => {
      running = false;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [items.length]);

  const activeItem = items[activeIndex];

  return (
    <div className="zzmv-root">
      <div className="zzmv-inner">
        {/* Scrollable zig-zag mini list */}
        <div className="zzmv-scroll-container" ref={containerRef}>
          {items.map((item, index) => (
            <div
              key={item.id}
              className={
                "zzmv-mini-item" +
                (index % 2 === 0 ? " zzmv-mini-left" : " zzmv-mini-right")
              }
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
            >
              <div className="zzmv-mini-card">
                <div className="zzmv-mini-title">{item.title}</div>
                {item.subtitle && (
                  <div className="zzmv-mini-subtitle">{item.subtitle}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Magnifier overlay */}
        <div className="zzmv-magnifier-overlay">
          <div className="zzmv-magnifier-frame">
            {activeItem && (
              <div className="zzmv-full-card">
                <div className="zzmv-full-title">{activeItem.title}</div>
                {activeItem.subtitle && (
                  <div className="zzmv-full-subtitle">
                    {activeItem.subtitle}
                  </div>
                )}
                {activeItem.description && (
                  <p className="zzmv-full-description">
                    {activeItem.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline styles for drop-in demo; move to SCSS/CSS in your project */}
      <style
        dangerouslySetInnerHTML={{
          __html: baseZigZagMagnifierStyles,
        }}
      />
    </div>
  );
};

/**
 * Optional demo usage you can paste into a Next.js page component.
 * Example:
 *
 *   import { ZigZagMagnifierDemo } from "@/components/MagnifierViewer";
 *
 *   export default function Page() {
 *     return <ZigZagMagnifierDemo />;
 *   }
 */
export const ZigZagMagnifierDemo: FC = () => {
  const demoItems: ViewerItem[] = [
    {
      id: "1",
      title: "Fluxel Grid Playground",
      subtitle: "Kinetic hero experiment",
      description:
        "An interactive pixel-grid engine with magnetic forces, responsive layout, and canvas/WebGL rendering.",
    },
    {
      id: "2",
      title: "Under Construction Machine",
      subtitle: "Physical comedy UX",
      description:
        "A chain-reaction under-construction scene with falling parts, sparks, and slapstick feedback tied to user input.",
    },
    {
      id: "3",
      title: "Sprite Sheet Renderer",
      subtitle: "CSS / Canvas / WebGL modes",
      description:
        "A renderer that can swap between CSS sprites, Canvas, and WebGL, allowing performance experimentation.",
    },
    {
      id: "4",
      title: "Parallax Project Carousel",
      subtitle: "Scroll-driven depth",
      description:
        "A multi-layer, scroll-driven carousel with perspective parallax and FLIP-synced metadata transitions.",
    },
    {
      id: "5",
      title: "NDA Vault",
      subtitle: "Gated case study system",
      description:
        "A secure route that exposes case studies only after NDA acceptance, with frictionless nav back to public work.",
    },
  ];

  return (
    <div className="zzmv-demo-shell">
      <MagnifierViewer items={demoItems} />
    </div>
  );
};

export const baseZigZagMagnifierStyles = `
.zzmv-root {
  position: relative;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
  box-sizing: border-box;
}

.zzmv-inner {
  position: relative;
}

/* Scrollable list container */
.zzmv-scroll-container {
  position: relative;
  max-height: min(540px, 70vh);
  margin: 0 auto;
  overflow-y: scroll;
  overflow-x: visible;
  scroll-snap-type: y mandatory;
  padding: 4rem 0;
  box-sizing: border-box;
}

.zzmv-scroll-container::-webkit-scrollbar {
  width: 8px;
}
.zzmv-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 4px;
}

.zzmv-mini-item {
  position: relative;
  height: 180px;
  scroll-snap-align: center;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  pointer-events: none;
}

.zzmv-mini-left,
.zzmv-mini-right {
  transform-origin: top left;
}

/* Zig-zag offsets */
.zzmv-mini-left {
  justify-content: flex-start;
  padding-left: 12%;
}

.zzmv-mini-right {
  justify-content: flex-end;
  padding-right: 12%;
}

/* Scaled-down card */
.zzmv-mini-card {
  pointer-events: auto;
  transform: scale(0.55);
  transform-origin: top left;
  min-width: 260px;
  max-width: 320px;
  padding: 1rem 1.25rem;
  border-radius: 18px;
  background: rgba(10, 10, 10, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7);
  color: #f5f5f5;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "Segoe UI", sans-serif;
}

.zzmv-mini-title {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.zzmv-mini-subtitle {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

/* Magnifier overlay */
.zzmv-magnifier-overlay {
  pointer-events: none;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zzmv-magnifier-frame {
  position: relative;
  width: min(480px, 80vw);
  max-width: 520px;
  padding: 1.25rem 1.4rem;
  border-radius: 28px;
  background: radial-gradient(
      circle at 30% 0%,
      rgba(255, 255, 255, 0.12),
      transparent 55%
    ),
    rgba(8, 8, 10, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  pointer-events: none;
  overflow: hidden;
}

/* Organic-ish highlight; replace with SVG mask if desired */
.zzmv-magnifier-frame::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 10% 0%, rgba(255, 255, 255, 0.12), transparent 55%),
    radial-gradient(circle at 85% 100%, rgba(255, 180, 80, 0.18), transparent 60%);
  mix-blend-mode: soft-light;
  opacity: 0.9;
  pointer-events: none;
}

.zzmv-full-card {
  position: relative;
  pointer-events: auto;
  color: #fdfdfd;
}

.zzmv-full-title {
  font-size: 1.4rem;
  font-weight: 650;
  letter-spacing: 0.03em;
}

.zzmv-full-subtitle {
  margin-top: 0.4rem;
  font-size: 0.9rem;
  opacity: 0.82;
}

.zzmv-full-description {
  margin-top: 0.85rem;
  font-size: 0.9rem;
  line-height: 1.5;
  opacity: 0.9;
}

/* Demo wrapper */
.zzmv-demo-shell {
  min-height: 100vh;
  background: radial-gradient(circle at top, #222637, #050509);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 3rem 1rem;
  box-sizing: border-box;
}
`;
