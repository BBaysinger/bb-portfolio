import { useRef, memo } from "react";
import ProjectData from "@/data/ProjectData";
import ProjectInfo from "./ProjectInfo";
import { DirectionType } from "./CarouselTypes";
import styles from "./InfoSwapper.module.scss";

interface InfoSwapperProps {
  index: number | null;
  direction?: DirectionType;
}

/**
 * Manages swapping between the project info components.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const InfoSwapper = memo<InfoSwapperProps>(({ direction, index }) => {
  const projects = ProjectData.activeProjectsRecord;
  const keys = ProjectData.activeKeys;
  const infoRefElems = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <div className={`${styles.infoSwapper} max-w-container`}>
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
});

export default InfoSwapper;
