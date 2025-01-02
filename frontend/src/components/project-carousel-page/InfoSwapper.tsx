import React, { useEffect, useRef, useState } from "react";
import ProjectData from "data/ProjectData";
import ProjectInfo from "./ProjectInfo";
import { DirectionType } from "./Carousel";
import styles from "./InfoSwapper.module.scss";

interface InfoSwapperProps {
  index: number | null;
  direction: DirectionType;
}

/**
 * Manages swapping between the project info components. Detects height of each component and
 * fluidly adjusts the height of the container accordingly to avoid excessive whitespace and
 * jarred transitions.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const InfoSwapper: React.FC<InfoSwapperProps> = ({ direction, index }) => {
  const projects = ProjectData.activeProjectsRecord;
  const keys = ProjectData.activeKeys;
  const infoRefElems = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  const updateHeight = () => {
    if (index !== null && infoRefElems.current[index]) {
      const activeElement = infoRefElems.current[index];
      if (activeElement) {
        const { height } = activeElement.getBoundingClientRect();
        setContainerHeight(height);
      }
    }
  };

  useEffect(() => {
    updateHeight();
  }, [index]);

  useEffect(() => {
    const handleResize = () => updateHeight();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [index]);

  return (
    <div
      ref={containerRef}
      className={`${styles["info-swapper"]} max-w-container`}
      style={{
        height: containerHeight ? `${containerHeight}px` : "auto",
      }}
    >
      <div className={"container"}>
        {keys.map((key, i) => (
          <ProjectInfo
            key={key}
            isActive={i === index}
            direction={direction}
            transition={""}
            ref={(el) => {
              if (el) infoRefElems.current[i] = el;
            }}
            dataNode={projects[key]}
          />
        ))}
      </div>
    </div>
  );
};

export default InfoSwapper;
