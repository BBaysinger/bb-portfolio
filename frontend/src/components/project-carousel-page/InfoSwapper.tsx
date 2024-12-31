import React, { useRef } from "react";

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
const LogoSwapper: React.FC<InfoSwapperProps> = ({ stabilizedIndex }) => {
  const projects = ProjectData.activeProjectsRecord;
  const keys = ProjectData.activeKeys;
  const infoRefElems = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <div className={`${styles["info-swapper"]} container`}>
      {keys.map((key, i) => (
        <ProjectInfo
          key={key}
          isActive={i === stabilizedIndex}
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

export default LogoSwapper;
