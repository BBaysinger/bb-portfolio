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
 * - Defines and composes multiple synchronized carousel layers (laptop, phone, and control).
 * - Uses a master/slave architecture where the "Control" layer drives user interaction,
 *   and the visible layers (Laptop and Phone) are visual-only followers.
 * - Supports smooth inertial scrolling and synchronization across all layers.
 * - Acts as the top-level container for a layered carousel system.
 * - Creates a custom scrollbar effect by leveraging a hidden control layer that mirrors the visible slides.
 *
 * Props:
 * - `projectId` (string): The ID of the current project (not directly used here but useful for future filtering or linking).
 * - `initialIndex` (number): The starting index of the carousel, applied to all layers.
 * - `refObj` (Ref): Ref used to imperatively control or query the LayeredCarouselManager.
 * - `onStabilizationUpdate` (function): Callback triggered when carousel scroll stabilizes,
 *    includes the stabilized index, scroll source, and scroll direction.
 *
 * Children:
 * - Renders one `LayeredCarouselManager` instance containing 3 layers:
 *    1. `Laptops`: A slave layer showing widescreen previews of each project.
 *    2. `Phones`: A slave layer showing mobile previews of each project.
 *    3. `Control`: A master layer with invisible slides that drive synchronization and scroll logic.
 *
 * Styling:
 * - Uses CSS Modules via `ProjectCarouselView.module.scss`.
 * - Class names are namespaced using the `bb-carousel-` prefix passed to the manager.
 *
 * @author Bradley Baysinger
 * @since 2025
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
          mobileStatus={project.mobileStatus}
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
