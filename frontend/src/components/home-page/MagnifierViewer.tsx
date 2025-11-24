"use client";

import clsx from "clsx";
import Image from "next/image";
import React, { useEffect, useRef, useState, type FC } from "react";

import styles from "./MagnifierViewer.module.scss";

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
 * - Vertical list of mini cards in a zig-zag path that flows with page scroll.
 * - A fixed magnifier overlay in the viewport center shows a full-size, readable card
 *   for whichever mini card is closest to the viewport center.
 *
 * Notes:
 * - Pure client component (`"use client";`).
 * - Items flow in normal document layout (no internal scroll container).
 * - Uses requestAnimationFrame to keep the active index in sync with window scroll.
 * - Magnifier overlay is fixed to viewport, tracking the nearest item.
 * - Styles are injected via a <style> tag for easy drop-in testing.
 */
export const MagnifierViewer: FC<{ items: ViewerItem[] }> = ({ items }) => {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Ensure refs array matches item length
  if (itemRefs.current.length !== items.length) {
    itemRefs.current = Array(items.length)
      .fill(null)
      .map((_, i) => itemRefs.current[i] || null);
  }

  useEffect(() => {
    let frameId: number | null = null;
    let running = true;

    const updateActiveIndex = () => {
      if (!running) return;
      // Use viewport center as reference point
      const centerY = window.innerHeight / 2;

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

  const _activeItem = items[activeIndex];

  return (
    <div className={styles.root}>
      {/* Zig-zag mini list flows in document */}
      {items.map((item, index) => (
        <div
          key={item.id}
          className={clsx(
            styles.miniItem,
            index % 2 === 0 ? styles.miniLeft : styles.miniRight,
          )}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
        >
          <div className={styles.miniCard}>
            <div className={styles.miniTitle}>{item.title}</div>
            {item.subtitle && (
              <div className={styles.miniSubtitle}>{item.subtitle}</div>
            )}
          </div>
        </div>
      ))}

      {/* Magnifier overlay fixed to viewport */}
      <div className={styles.magnifierOverlay}>
        <Image
          src="/images/projects-list/magnifier.webp"
          alt="Magnifying glass"
          width={603}
          height={415.5}
          className={styles.magnifierImage}
        />
      </div>
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
    <div className={styles.demoShell}>
      <MagnifierViewer items={demoItems} />
    </div>
  );
};
