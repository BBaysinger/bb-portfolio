import clsx from "clsx";
import React from "react";

import styles from "@/app/cv/CvPage.module.scss";
import { RawImg } from "@/components/common/RawImg";

export type CvExperienceItemData = {
  company: string;
  location: string;
  title: string;
  description: string;
  technicalScope: string;
  date: string;
  bulletPoints?: string[];
  logo?: {
    url: string;
    alt: string;
  } | null;
};

type ExperienceItemProps = {
  item: CvExperienceItemData;
  addToRefs: (el: HTMLElement | SVGElement | null) => void;
};

const ExperienceItem: React.FC<ExperienceItemProps> = ({ item, addToRefs }) => {
  const bulletPoints = Array.isArray(item.bulletPoints)
    ? item.bulletPoints
    : [];
  const divClassLt = clsx(
    "col-xs-12",
    "col-sm-12",
    "col-md-3",
    "col-lg-3",
    styles.cvLeft,
  );

  const divClassRt = clsx(
    "col-xs-12",
    "col-sm-12",
    "col-md-9",
    "col-lg-9",
    styles.cvRight,
  );

  const rowClass = clsx("row", styles.row);

  return (
    <div className={rowClass}>
      <div className={divClassLt}>
        {item.logo?.url ? (
          <RawImg
            ref={addToRefs}
            src={item.logo.url}
            className={styles.cvLogo}
            alt={item.logo.alt || `${item.company} Logo`}
          />
        ) : null}
      </div>

      <div className={divClassRt}>
        <div ref={addToRefs} className={styles.subContainer}>
          <div className={styles.leftSub}>
            <h5>
              {item.company}
              <span className={styles.location}> — {item.location}</span>
            </h5>
            {item.title}
          </div>
          <div className={styles.break}></div>
          <div className={styles.rightSub}>[ {item.date} ]</div>
        </div>

        <p ref={addToRefs} className={styles.desc}>
          {item.description}
        </p>

        <p ref={addToRefs} className={styles.scope}>
          <span>Technical Scope:</span> {item.technicalScope}
        </p>

        {bulletPoints.length > 0 ? (
          <ul>
            {bulletPoints.map((point, index) => (
              <li
                key={`${item.company}-${item.date}-${index}-${point.slice(0, 24)}`}
                ref={addToRefs}
              >
                {point}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
};

export default ExperienceItem;
