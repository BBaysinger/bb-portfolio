import React, { useState, useEffect } from "react";

import styles from "./LogoSwapper.module.scss";

interface LogoSwapperProps {
  projectId: string;
}

const clientNames: Record<string, string> = {
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

const fileVariants: Record<string, string> = {
  att: "att-black",
  premera: "premera-black",
  abbvie: "abbvie-dark",
};

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const LogoSwapper: React.FC<LogoSwapperProps> = ({ projectId }) => {
  const [currentLogoId, setCurrentLogoId] = useState(projectId);
  const [isBlurred, setIsBlurred] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // Track mount state

  useEffect(() => {
    // Set component as mounted to trigger fade-in
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

  // If there's a logo variant (for contrast on white), use it.
  const backgroundImage = (key: string) => {
    const fileName = fileVariants[key] || key;
    return `url(/images/client-logos/${fileName}.svg)`;
  };

  return (
    <div className={"max-w-container"}>
      <div className={"container"}>
        <div
          className={`${styles["logo-swapper"]} ${isBlurred ? "" : styles.unblurred} ${
            isMounted ? styles["fade-in"] : styles["fade-out"]
          }`}
        >
          {Object.entries(clientNames).map(([key, value]) => (
            <div
              key={key}
              style={{
                backgroundImage: backgroundImage(key),
              }}
              className={`${styles["client-logo"]} ${
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
