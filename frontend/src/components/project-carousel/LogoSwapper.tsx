import React, { useState, useEffect } from "react";

import styles from "./LogoSwapper.module.scss";

interface LogoSwapperProps {
  id: string;
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
  chalklabs: "ChalkLabs",
  citibank: "Citibank",
  golden1: "Golden 1 Credit Union",
};

const fileVariants: Record<string, string> = {
  att: "att_black",
  premera: "premera_black",
};

const LogoSwapper: React.FC<LogoSwapperProps> = ({ id }) => {
  const [currentLogoId, setCurrentLogoId] = useState(id);
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    // Trigger the blur effect
    setIsBlurred(true);

    // Delay to allow the unblur transition
    const timeout = setTimeout(() => {
      setCurrentLogoId(id);
      setIsBlurred(false);
    }, 300); // Match this to your CSS animation duration

    return () => clearTimeout(timeout);
  }, [id]);

  return (
    <div
      id="logoSwapper"
      className={`${styles["logo-swapper"]} ${isBlurred ? styles.blurred : ""}`}
    >
      {Object.entries(clientNames).map(([key, value]) => (
        <img
          key={key}
          src={`/images/client-logos/${key in fileVariants ? fileVariants[key] : key}.svg`}
          className={`${styles["client-logo"]} ${
            currentLogoId === key ? styles.visible : ""
          }`}
          alt={value}
        />
      ))}
    </div>
  );
};

export default LogoSwapper;
