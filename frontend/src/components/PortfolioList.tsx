import React, { useState, useEffect, useRef, useCallback } from "react";
import ExecutionEnvironment from "exenv";

import PieceThumbnail from "components/PieceThumbnail";
import HeaderMain from "components/HeaderMain";
import portfolioData from "data/PortfolioData";
import HoverCapabilityWatcher from "utils/HoverCapabilityWatcher";
import "./PortfolioList.scss";

const PortfolioList: React.FC = () => {
  const [focusedThumbIndex, setFocusedThumbIndex] = useState(-1);
  const pieceThumbRefs = useRef<Array<React.RefObject<PieceThumbnail | null>>>(
    [],
  );
  const ticking = useRef(false);

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

  const getIndexOfElement = useCallback((element: HTMLElement): number => {
    const parent = element.parentNode;

    if (!parent) {
      return -1;
    }

    const siblings = Array.from(parent.children).filter(
      (sibling) => sibling.tagName === element.tagName,
    );

    return siblings.indexOf(element);
  }, []);

  const update = useCallback(
    (e: Event) => {
      if (ExecutionEnvironment.canUseDOM) {
        if (HoverCapabilityWatcher.instance.isHoverCapable) {
          let offset;
          let absOffset;
          let bounding;
          let linkHeight;
          let targetMaxOffset;
          let inRange: Array<HTMLElement> = [];

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
                  inRange.push(domNode);
                }
              }
            }
          });

          inRange.forEach((thumbRef, index) => {
            const thumb = thumbRef;

            if (thumb) {
              bounding = thumb.getBoundingClientRect();
              linkHeight = thumb.offsetHeight / inRange.length;
              const top = bounding.top + linkHeight * index;
              targetMaxOffset = linkHeight / 2;
              offset = window.innerHeight / 2 - (top + targetMaxOffset);
              absOffset = Math.abs(offset);

              if (absOffset < targetMaxOffset) {
                setFocusedThumbIndex(getIndexOfElement(thumb));
              }
            }
          });
        } else {
          if (e.type === "resize") {
            setFocusedThumbIndex(-1);
          }
        }
      }
    },
    [getIndexOfElement],
  );

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
      <div className="portfolio_list">
        <div id="list"></div>
        {portfolioData.listedPieces.map((pieceData, index) => {
          const id = portfolioData.listedKeys[index];
          const { title, omitFromList, clientId, property, shortDesc, desc } =
            pieceData;

          return (
            <PieceThumbnail
              focused={focusedThumbIndex === index}
              key={title}
              index={index}
              omitFromList={omitFromList}
              pieceId={id}
              title={title}
              clientId={clientId}
              property={property}
              shortDesc={shortDesc}
              desc={desc}
              ref={(node) => setThumbRef(node, index)} // Pass DOM ref
            />
          );
        })}
      </div>
    </div>
  );
};

export default PortfolioList;
