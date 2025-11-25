"use client";

import { ParsedPortfolioProject } from "@/data/ProjectData";

import styles from "./MagnifierProjectsList.module.scss";
import { MagnifierContext } from "./MagnifierViewer";

interface MagnifierProjectsListProps {
  projects: ParsedPortfolioProject[];
  context: MagnifierContext;
}

/**
 * MagnifierProjectsList
 *
 * Displays portfolio projects in a zig-zag vertical layout.
 * Designed to be rendered twice by MagnifierViewer:
 * - Once at mini scale in page flow
 * - Once at full scale inside magnifier overlay
 */
export default function MagnifierProjectsList({
  projects,
  context: _context,
}: MagnifierProjectsListProps) {
  return (
    <div className={styles.list}>
      {projects.map((project, index) => (
        <div
          key={project.id}
          className={index % 2 === 0 ? styles.itemLeft : styles.itemRight}
        >
          <div className={styles.card}>
            <div className={styles.title}>{project.title}</div>
            {project.brandId && (
              <div className={styles.subtitle}>{project.brandId}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
