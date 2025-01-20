import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  RefObject,
} from "react";
import ExecutionEnvironment from "exenv";

import ProjectData from "data/ProjectData";
import ProjectThumbnail from "components/home-page/ProjectThumbnail";
import HeaderMain from "components/home-page/HeaderMain";
import styles from "./PortfolioList.module.scss";

/**
 * PortfolioList Component
 *
 * Dynamically displays a list of portfolio thumbnails in a responsive list on the home page.
 * Each thumbnail reveals detailed information when hovered (on hover-capable devices)
 * or dynamically scroll-focused (on non-hover-capable devices).
 *
 * Key Features:
 * - Detects hover capability using HoverCapabilityWatcher.
 * - Implements a fallback interaction for touch devices, dynamically focusing thumbnails during scroll events.
 * - Handles flexible layout where thumbnails wrap into multiple rows, adapting interaction logic accordingly.
 *
 * @author Bradley Baysinger
 * @version 1.0
 * @since 2024-12-10
 * @version N/A
 */
const PortfolioList: React.FC = () => {
  const [focusedThumbIndex, setFocusedThumbIndex] = useState(-1); // Tracks the currently focused thumbnail index
  const projectThumbRefs = useRef<
    Array<React.RefObject<HTMLDivElement | null>>
  >([]);
  const ticking = useRef(false); // Tracks whether a scroll/resize event is currently being processed

  /**
   * Initializes a reference to a DOM node for a thumbnail.
   * Ensures each thumbnail has a corresponding ref stored in projectThumbRefs.
   */
  const setThumbRef = useCallback(
    (node: HTMLDivElement | null, index: number) => {
      if (!projectThumbRefs.current[index]) {
        projectThumbRefs.current[index] =
          React.createRef<HTMLDivElement | null>();
      }
      projectThumbRefs.current[index].current = node;
    },
    [],
  );

  /**
   * Updates the focused thumbnail on hoverless views based on scroll or resize events.
   */
  const update = useCallback(
    (_: Event) => {
      if (ExecutionEnvironment.canUseDOM) {
        let offset;
        let absOffset;
        let bounding;
        let linkHeight;
        let targetMaxOffset;
        let inRange: Array<RefObject<HTMLDivElement | null>> = [];

        projectThumbRefs.current.forEach((thumbRef) => {
          const domNode = thumbRef.current;
          if (domNode) {
            bounding = domNode.getBoundingClientRect();
            linkHeight = domNode.offsetHeight;
            targetMaxOffset = linkHeight / 2;
            offset = window.innerHeight / 2 - (bounding.top + targetMaxOffset);
            absOffset = Math.abs(offset);

            if (absOffset < targetMaxOffset) {
              inRange.push(thumbRef);
            }
          }
        });

        // Sequentially determine focus for thumbnails in the same row when in
        // multiple columns, based on their vertical scroll position. That is,
        // As the user scrolls, along one row, from left to right, as the user
        // scrolls down, the next thumbnail in the row will be focused.
        inRange.forEach((thumbRef, index) => {
          const domNode = thumbRef.current;
          if (domNode) {
            bounding = domNode.getBoundingClientRect();
            linkHeight = domNode.offsetHeight / inRange.length;

            const top = bounding.top + linkHeight * index;
            targetMaxOffset = linkHeight / 2;
            offset = window.innerHeight / 2 - (top + targetMaxOffset);
            absOffset = Math.abs(offset);

            if (absOffset < targetMaxOffset) {
              const newIndex = getThumbnailIndex(thumbRef);
              if (focusedThumbIndex !== newIndex) {
                setFocusedThumbIndex(newIndex);
              }
            }
          }
        });
      }
    },
    [focusedThumbIndex],
  );

  /**
   * Retrieves the index of a given thumbnail ref from the projectThumbRefs array.
   */
  const getThumbnailIndex = (
    thumbRef: RefObject<HTMLDivElement | null>,
  ): number => {
    return projectThumbRefs.current.findIndex((ref) => ref === thumbRef);
  };

  /**
   * Handles scroll and resize events efficiently using requestAnimationFrame.
   * Prevents multiple redundant updates by batching logic.
   */
  const handleScrollOrResize = useCallback(
    (e: Event) => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          update(e);
          ticking.current = false;
        });
        ticking.current = true;
      }
    },
    [update],
  );

  /**
   * Sets up event listeners for scroll and resize events.
   * Cleans up listeners when the component is unmounted.
   */
  useEffect(() => {
    document.addEventListener("scroll", handleScrollOrResize);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [handleScrollOrResize]);

  return (
    <div>
      <HeaderMain />
      <div className={styles["portfolio-list"]}>
        <div id="list" className={styles["list"]}></div>
        {ProjectData.listedProjects.map((projectData, index) => {
          const id = ProjectData.listedKeys[index];
          const { title, omitFromList, clientId } = projectData;

          return (
            <ProjectThumbnail
              focused={focusedThumbIndex === index}
              key={title}
              index={index}
              omitFromList={omitFromList}
              projectId={id}
              title={title}
              clientId={clientId}
              ref={(node) => setThumbRef(node, index)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PortfolioList;
