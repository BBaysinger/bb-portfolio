import React, { useState, useEffect, useMemo } from "react";

import ProjectData from "@/data/ProjectData";
import getBrandLogoUrl from "@/utils/getBrandLogoUrl";

import styles from "./LogoSwapper.module.scss";

interface LogoSwapperProps {
  /** Preferred: stabilized carousel index to drive the active item. */
  index?: number | null;
  /** Back-compat: brand key (slug) to focus on if index not provided. */
  projectId?: string;
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

// No static filename fallbacks — URLs come from CMS brand relations only.

/**
 *
 *
 */
const LogoSwapper: React.FC<LogoSwapperProps> = ({
  index = null,
  projectId,
}) => {
  // Resolve the current brandId either from index (preferred) or projectId fallback
  const projectsRecord = ProjectData.activeProjectsRecord;
  const keys = ProjectData.activeKeys;
  const resolvedBrandId = useMemo(() => {
    if (typeof index === "number" && index >= 0 && index < keys.length) {
      const projKey = keys[index];
      return projectsRecord[projKey]?.brandId ?? projectId ?? "";
    }
    return projectId ?? "";
  }, [index, keys, projectsRecord, projectId]);

  const [currentLogoId, setCurrentLogoId] = useState(resolvedBrandId);
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
        setCurrentLogoId(resolvedBrandId);
        setIsBlurred(false);
      }, 300);
    }, 400);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [resolvedBrandId]);

  // Build a mapping of brandKey -> background-image URL (or none for NDA)
  const brandLogoMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    // Use all active projects' brand metadata to derive logo availability
    const projects = ProjectData.activeProjects;
    // If any active project is NDA, we're on an NDA-allowed route; permit NDA logos
    const allowNdaLogo = projects.some((p) => !!p.nda);
    for (const p of projects) {
      const key = p.brandId;
      if (!key) continue;
      if (map[key] !== undefined) continue; // first occurrence wins
      map[key] = getBrandLogoUrl({
        brandId: key,
        brandIsNda: p.brandIsNda,
        allowNdaLogo,
        lightUrl: p.brandLogoLightUrl,
        darkUrl: p.brandLogoDarkUrl,
        preferDark: true,
      });
    }
    return map;
  }, []);

  // Derive the list of brands to render from the available logo map so that
  // any active brand (even if not present in the static label map) is included.
  const brandKeys = useMemo(() => Object.keys(brandLogoMap), [brandLogoMap]);

  const backgroundImage = (key: string) => {
    const url = brandLogoMap[key];
    return url ? `url(${url})` : "none";
  };

  return (
    <div className={"max-w-container"}>
      <div className={"container"}>
        <div
          className={`${styles.logoSwapper} ${isBlurred ? "" : styles.unBlurred} ${
            isMounted ? styles.fadeIn : styles.fadeOut
          }`}
        >
          {brandKeys.map((key) => (
            <div
              key={key}
              style={{
                backgroundImage: backgroundImage(key),
              }}
              className={`${styles.brandLogo} ${
                currentLogoId === key ? styles.visible : ""
              }`}
              role="img"
              aria-label={`${brandNames[key] ?? key} logo`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogoSwapper;
