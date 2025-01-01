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
  const [timedIndex, setTimedIndex] = useState<number | null>(null);

  const updateHeight = () => {
    if (timedIndex !== null && infoRefElems.current[timedIndex]) {
      const activeElement = infoRefElems.current[timedIndex];
      if (activeElement) {
        const { height } = activeElement.getBoundingClientRect();
        setContainerHeight(height);
      }
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (stabilizedIndex === null) {
      setTimedIndex(stabilizedIndex);
    } else {
      timeoutId = setTimeout(() => {
        setTimedIndex(stabilizedIndex);
      }, 400);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [stabilizedIndex]);

  useEffect(() => {
    updateHeight();
  }, [timedIndex]);

  useEffect(() => {
    const handleResize = () => updateHeight();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [timedIndex]);

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
          isActive={i === timedIndex}
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
