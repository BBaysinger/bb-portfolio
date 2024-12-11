import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  RefObject,
} from "react";
import ExecutionEnvironment from "exenv";

import PieceThumbnail from "components/PieceThumbnail";
import HeaderMain from "components/HeaderMain";
import portfolioData from "data/PortfolioDataUtil";
import HoverCapabilityWatcher from "utils/HoverCapabilityWatcher";
import "./PortfolioList.scss";

/**
 * PortfolioList Component
 *
 * This component dynamically displays a list of portfolio thumbnails.
 * Each thumbnail reveals detailed information when hovered (on hover-capable devices)
 * or dynamically scroll-focused (on non-hover-capable devices).
 *
 * Key Features:
 * - Detects hover capability using HoverCapabilityWatcher.
 * - Implements a fallback interaction for touch devices, dynamically focusing thumbnails during scroll events.
 * - Handles flexible layout where thumbnails wrap into multiple rows, adapting interaction logic accordingly.
 *
 * @author Bradley Baysinger
 * @contributor ChatGPT (Documentation)
 * @version 1.0
 * @since 2024-12-10
 * @version N/A
 */
const PortfolioList: React.FC = () => {
  const [focusedThumbIndex, setFocusedThumbIndex] = useState(-1); // Tracks the currently focused thumbnail index
  const pieceThumbRefs = useRef<Array<React.RefObject<PieceThumbnail | null>>>(
    [],
  ); // Array of references to thumbnail components
  const ticking = useRef(false); // Tracks whether a scroll/resize event is currently being processed

  /**
   * Initializes a reference to a PieceThumbnail component.
   * Ensures each thumbnail has a corresponding ref stored in pieceThumbRefs.
   */
  const setThumbRef = useCallback(
    (thumbComponent: PieceThumbnail | null, index: number) => {
      if (!pieceThumbRefs.current[index]) {
        pieceThumbRefs.current[index] =
          React.createRef<PieceThumbnail | null>();
      }
      pieceThumbRefs.current[index].current = thumbComponent;
    },
    [],
  );

  /**
   * Updates the focused thumbnail based on scroll or resize events.
   *
   * Non-hover-capable devices:
   * - Determines which thumbnails are in range vertically.
   * - Sequentially highlights thumbnails in the same row based on their horizontal position.
   *
   * Hover-capable devices:
   * - Resets focus to allow hover interaction to take precedence.
   */
  const update = useCallback((e: Event) => {
    if (ExecutionEnvironment.canUseDOM) {
      if (!HoverCapabilityWatcher.instance.isHoverCapable) {
        let offset;
        let absOffset;
        let bounding;
        let linkHeight;
        let targetMaxOffset;
        let inRange: Array<RefObject<PieceThumbnail | null>> = [];

        // Identify thumbnails within vertical focus range
        pieceThumbRefs.current.forEach((thumbRef) => {
          if (thumbRef.current) {
            const thumb: PieceThumbnail = thumbRef.current;
            const domNode: HTMLElement | null = thumb?.getDOMNode();
            if (domNode) {
              bounding = domNode.getBoundingClientRect();
              linkHeight = domNode.offsetHeight;
              targetMaxOffset = linkHeight / 2;
              offset =
                window.innerHeight / 2 - (bounding.top + targetMaxOffset);
              absOffset = Math.abs(offset);

              if (absOffset < targetMaxOffset) {
                inRange.push(thumbRef);
              }
            }
          }
        });

        // Sequentially determine focus for thumbnails in the same row
        inRange.forEach((thumbRef, index) => {
          if (thumbRef.current) {
            const thumb: PieceThumbnail = thumbRef.current;
            const domNode: HTMLElement | null = thumb?.getDOMNode();

            if (domNode) {
              bounding = domNode?.getBoundingClientRect();
              linkHeight = domNode.offsetHeight / inRange.length;
              const top = bounding.top + linkHeight * index;
              targetMaxOffset = linkHeight / 2;
              offset = window.innerHeight / 2 - (top + targetMaxOffset);
              absOffset = Math.abs(offset);
              if (absOffset < targetMaxOffset) {
                setFocusedThumbIndex(getThumbnailIndex(thumbRef));
              }
            }
          }
        });
      } else {
        if (e.type === "resize") {
          setFocusedThumbIndex(-1); // Reset focus on resize for hover-capable devices
        }
      }
    }
  }, []);

  /**
   * Retrieves the index of a given thumbnail ref from the pieceThumbRefs array.
   */
  const getThumbnailIndex = (
    thumbRef: RefObject<PieceThumbnail | null>,
  ): number => {
    return pieceThumbRefs.current.findIndex((ref) => ref === thumbRef);
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

  /**
   * Renders the portfolio list and dynamically assigns refs to each thumbnail.
   */
  return (
    <div>
      <HeaderMain />
      <div className="portfolio_list">
        <div id="list"></div>
        {portfolioData.listedPieces.map((pieceData, index) => {
          const id = portfolioData.listedKeys[index];
          const { title, omitFromList, clientId } = pieceData;

          return (
            <PieceThumbnail
              focused={focusedThumbIndex === index}
              key={title}
              index={index}
              omitFromList={omitFromList}
              pieceId={id}
              title={title}
              clientId={clientId}
              ref={(node) => setThumbRef(node, index)} // Pass DOM ref
            />
          );
        })}
      </div>
    </div>
  );
};

export default PortfolioList;
