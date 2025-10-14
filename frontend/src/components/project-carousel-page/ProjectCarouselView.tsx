import React, { useMemo } from "react";

import ProjectData from "@/data/ProjectData";

import { SourceType, DirectionType } from "./CarouselTypes";
import DeviceDisplay, { DeviceTypes } from "./DeviceDisplay";
import LayeredCarouselManager, {
  CarouselLayerConfig,
  LayeredCarouselManagerRef,
} from "./LayeredCarouselManager";
import styles from "./ProjectCarouselView.module.scss";

/**
 * ProjectCarouselView Component
 *
 * - High-level layout and configuration layer for the carousel system.
 * - Assembles visual device layers (Laptop and Phone) and a hidden master control layer.
 * - Delegates all scrolling and synchronization behavior to `LayeredCarouselManager`.
 * - Defines the visual structure and data-driven content for each layer.
 *
 * Distinction:
 * - Unlike `LayeredCarouselManager`, this component does **not handle scroll logic**.
 *   Instead, it defines **what** to render and **how** it's layered.
 * - This is the “view” layer — wiring up project data, slide spacing, and visual types.
 * - You could swap out the devices or modify layer behavior without touching the core scroll engine.
 *
 * Props:
 * - `projectId` (string): The project currently being viewed (useful for external state sync).
 * - `initialIndex` (number): The index to start the carousel on.
 * - `refObj` (Ref): Exposes scroll control on the master layer to parent components.
 * - `onStabilizationUpdate`: Callback fired when scroll locks onto a slide.
 *
 * Behavior:
 * - Builds a `layers` config array with three layers:
 *   1. `Laptops`: A slave layer showing desktop project previews.
 *   2. `Phones`: A slave layer showing mobile project previews.
 *   3. `Control`: A master layer with `null` slides to serve as a scroll driver.
 *
 * Styling:
 * - Uses namespaced class names and CSS modules.
 * - The `bb-carousel-` prefix ensures consistent class resolution within nested components.
 *
 * Example:
 * Used inside project detail pages to render a synchronized multi-device preview carousel.
 * The scroll interactions and stabilization logic are handled entirely by LayeredCarouselManager.
 *
 */
const ProjectCarouselView: React.FC<{
  projectId: string;
  initialIndex: number;
  refObj: React.RefObject<LayeredCarouselManagerRef | null>;
  onStabilizationUpdate: (
    index: number,
    source: SourceType,
    direction: DirectionType,
  ) => void;
}> = ({ initialIndex, refObj, onStabilizationUpdate }) => {
  const laptopSlides = useMemo(
    () =>
      ProjectData.activeProjects.map((project) => (
        <DeviceDisplay
          deviceType={DeviceTypes.LAPTOP}
          id={project.id}
          key={project.id}
        />
      )),
    [],
  );

  const phoneSlides = useMemo(
    () =>
      ProjectData.activeProjects.map((project) => (
        <DeviceDisplay
          deviceType={DeviceTypes.PHONE}
          mobileOrientation={project.mobileOrientation}
          id={project.id}
          key={project.id}
        />
      )),
    [],
  );

  const layers: CarouselLayerConfig[] = [
    {
      id: "Laptops",
      spacing: 693,
      slides: laptopSlides,
      type: "Slave",
    },
    {
      id: "Phones",
      spacing: 900,
      slides: phoneSlides,
      type: "Slave",
    },
    {
      id: "Control",
      spacing: 720,
      slides: laptopSlides.map(() => null),
      type: "Master",
    },
  ];

  const prefix = "bb-carousel-";

  return (
    <div className={styles.projectCarouselView}>
      <LayeredCarouselManager
        ref={refObj}
        prefix={prefix}
        styleMap={styles}
        layers={layers}
        initialIndex={initialIndex}
        onStabilizationUpdate={onStabilizationUpdate}
      />
    </div>
  );
};

export default ProjectCarouselView;
