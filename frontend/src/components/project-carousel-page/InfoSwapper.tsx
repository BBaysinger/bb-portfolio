import { useRef, memo } from "react";

import ProjectData from "@/data/ProjectData";
import { useProjectDataVersion } from "@/hooks/useProjectDataVersion";

import { DirectionType } from "./CarouselTypes";
import styles from "./InfoSwapper.module.scss";
import ProjectInfo from "./ProjectInfo";

interface InfoSwapperProps {
  index: number | null;
  direction?: DirectionType;
  /** Optional explicit key order to match the carousel slides. */
  slideKeys?: string[];
}

/**
 * Manages swapping between the project info components.
 *
 */
const InfoSwapper = memo<InfoSwapperProps>(
  ({ direction, index, slideKeys }) => {
    // Subscribe to ProjectData updates so NDA placeholders can upgrade in-place.
    useProjectDataVersion();

    const projects = ProjectData.activeProjectsRecord;
    const keys = slideKeys ?? ProjectData.activeKeys;
    const infoRefElems = useRef<(HTMLDivElement | null)[]>([]);

    return (
      <div className={`${styles.infoSwapper} max-w-container`}>
        <div className={"container"}>
          {(keys || []).map((key, i) => {
            const dataNode = projects[key];
            if (!dataNode) return null;
            return (
              <ProjectInfo
                key={key}
                isActive={i === index}
                direction={direction}
                transition={""}
                ref={(el) => {
                  if (el) infoRefElems.current[i] = el;
                }}
                dataNode={dataNode}
              />
            );
          })}
        </div>
      </div>
    );
  },
);

InfoSwapper.displayName = "InfoSwapper";

export default InfoSwapper;
