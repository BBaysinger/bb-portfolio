import React, { useMemo } from "react";

import ProjectData from "@/data/ProjectData";

import { SourceType, DirectionType } from "./CarouselTypes";
import DeviceDisplay, { DeviceTypes } from "./DeviceDisplay";
import LayeredCarouselManager, {
  CarouselLayerConfig,
  LayeredCarouselManagerRef,
} from "./LayeredCarouselManager";
import styles from "./ProjectCarouselView.module.scss";

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
      id: "Control",
      spacing: 720,
      slides: laptopSlides.map(() => null),
      type: "Master",
    },
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
