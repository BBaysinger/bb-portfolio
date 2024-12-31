import React, { useEffect, useRef, useState } from "react";

import ProjectData from "data/ProjectData";
import ProjectInfo from "./ProjectInfo";
import styles from "./InfoSwapper.module.scss";

interface InfoSwapperProps {
  stabilizedIndex: number | null;
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
const InfoSwapper: React.FC<InfoSwapperProps> = ({ stabilizedIndex }) => {
  const projects = ProjectData.activeProjectsRecord;
  const keys = ProjectData.activeKeys;
  const infoRefElems = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const [delayedIndex, setDelayedIndex] = useState<number | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (stabilizedIndex !== null) {
      // Delay updating the delayedIndex state
      timeoutId = setTimeout(() => {
        setDelayedIndex(stabilizedIndex);
      }, 500);
    }

    return () => {
      // Clear timeout on cleanup
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [stabilizedIndex]);

  useEffect(() => {
    if (delayedIndex !== null && infoRefElems.current[delayedIndex]) {
      const activeElement = infoRefElems.current[delayedIndex];
      if (activeElement) {
        const { height } = activeElement.getBoundingClientRect();
        setContainerHeight(height);
      }
    }
  }, [delayedIndex]);

  return (
    <div
      ref={containerRef}
      className={`${styles["info-swapper"]} container`}
      style={{
        height: containerHeight ? `${containerHeight}px` : "auto",
      }}
    >
      {keys.map((key, i) => (
        <ProjectInfo
          key={key}
          isActive={i === delayedIndex}
          transition={""}
          ref={(el) => {
            if (el) infoRefElems.current[i] = el;
          }}
          dataNode={projects[key]}
        />
      ))}
    </div>
  );
};

export default InfoSwapper;
