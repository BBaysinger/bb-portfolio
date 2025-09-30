import React, { useState, useEffect, useMemo } from "react";

import ProjectData from "@/data/ProjectData";
import getBrandLogoUrl from "@/utils/getBrandLogoUrl";

import styles from "./LogoSwapper.module.scss";

interface LogoSwapperProps {
  /** The brand key (slug) to focus on, not a project slug. */
  projectId: string;
}

const brandNames: Record<string, string> = {
  nick: "Nickelodeon",
  addicting: "Addicting Games",
  att: "AT&T",
  cfc: "Committee for Children",
  nickjr: "Nick Jr",
  seven2: "Seven2 Interactive",
  teennick: "Teen Nick",
  nintendo: "Nintendo",
  premera: "Premera",
  usda: "USDA",
  citibank: "Citibank",
  abbvie: "AbbVie",
  exas: "Exact Sciences",
  golden1: "Golden 1 Credit Union",
  bbi: "BBInteractive",
};

// Deprecated: kept for reference during transition; dynamic URLs supersede this.
const fileVariants: Record<string, string> = {};

/**
 *
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
const LogoSwapper: React.FC<LogoSwapperProps> = ({ projectId }) => {
  const [currentLogoId, setCurrentLogoId] = useState(projectId);
  const [isBlurred, setIsBlurred] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // Track mount state

  useEffect(() => {
    // Set component as mounted to trigger fadeIn
    setIsMounted(true);
    let timeout2: NodeJS.Timeout;
    // Handle blur transition
    const timeout1 = setTimeout(() => {
      setIsBlurred(true);
      timeout2 = setTimeout(() => {
        setCurrentLogoId(projectId);
        setIsBlurred(false);
      }, 300);
    }, 400);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [projectId]);

  // Build a mapping of brandKey -> background-image URL (or none for NDA)
  const brandLogoMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    // Use all active projects' brand metadata to derive logo availability
    const projects = ProjectData.activeProjects;
    for (const p of projects) {
      const key = p.brandId;
      if (!key) continue;
      if (map[key] !== undefined) continue; // first occurrence wins
      map[key] = getBrandLogoUrl({
        brandId: key,
        brandIsNda: p.brandIsNda,
        lightUrl: p.brandLogoLightUrl,
        darkUrl: p.brandLogoDarkUrl,
        preferDark: true,
      });
    }
    return map;
  }, []);

  const backgroundImage = (key: string) => {
    const url = brandLogoMap[key];
    const fallback = fileVariants[key] || key;
    const chosen = url ?? `/images/brand-logos/${fallback}.svg`;
    return url ? `url(${chosen})` : "none";
  };

  return (
    <div className={"max-w-container"}>
      <div className={"container"}>
        <div
          className={`${styles.logoSwapper} ${isBlurred ? "" : styles.unBlurred} ${
            isMounted ? styles.fadeIn : styles.fadeOut
          }`}
        >
          {Object.entries(brandNames).map(([key, value]) => (
            <div
              key={key}
              style={{
                backgroundImage: backgroundImage(key),
              }}
              className={`${styles.brandLogo} ${
                currentLogoId === key ? styles.visible : ""
              }`}
              role="img"
              aria-label={`${value} logo`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogoSwapper;
