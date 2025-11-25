"use client";

import Image from "next/image";
import type { FC } from "react";

import styles from "./MagnifierViewer.module.scss";

export interface ViewerItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
}

export interface MagnifierContext {
  isMagnified: boolean;
}

interface MagnifierViewerProps {
  renderList: (context: MagnifierContext) => React.ReactNode;
}

/**
 * MagnifierViewer
 *
 * Creative experimental UI solution (for now tablet only) where
 * one item in a list gets focus at a time, this component does it by magnification
 * of a list of thumbnails.
 * It's a wrapper that renders a list component twice:
 * - Once in the normal page flow, with scroll-snap behavior
 * - Once inside a magnifier overlay (magnified, clipped, and panned around)
 *
 * The magnifier image provides the visual effect.
 */
export const MagnifierViewer: FC<MagnifierViewerProps> = ({ renderList }) => {
  return (
    <div className={styles.root}>
      {/* List renders in normal page flow */}
      {renderList({ isMagnified: false })}

      {/* Magnifier overlay with magnified list */}
      <div className={styles.magnifierOverlay}>
        {/* Magnified list inside magnifier */}
        <div className={styles.magnifiedContent}>
          {renderList({ isMagnified: true })}
        </div>
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
      <MagnifierViewer
        renderList={(context) => (
          <div data-context={context}>
            {demoItems.map((item) => (
              <div key={item.id}>
                <div>{item.title}</div>
                {item.subtitle && <div>{item.subtitle}</div>}
              </div>
            ))}
          </div>
        )}
      />
    </div>
  );
};
