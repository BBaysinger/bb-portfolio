import clsx from "clsx";
import type { CSSProperties } from "react";

import styles from "./BrandLockupView.module.scss";

const OG_ROOT_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const OG_LOGO_STYLE: CSSProperties = {
  position: "relative",
  top: "calc(50% - 4px)",
  width: 22,
  height: 38,
  maxHeight: 38,
  flexShrink: 0,
  transform: "translateY(-50%)",
};

const OG_TEXT_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const OG_NAME_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  columnGap: 0,
  fontSize: 24,
  fontWeight: 400,
  letterSpacing: 0,
  marginBlockStart: 0,
  marginTop: -3,
  marginBottom: -7,
  whiteSpace: "nowrap",
};

const OG_FIRST_NAME_STYLE: CSSProperties = {
  color: "#999",
  marginRight: -2,
};

const OG_LAST_NAME_STYLE: CSSProperties = {
  color: "rgba(141, 181, 40, 1)",
};

const OG_ROLE_CONTAINER_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  lineHeight: 1,
};

const OG_ROLE_TITLE_STYLE: CSSProperties = {
  color: "#f3f6f8",
  whiteSpace: "nowrap",
};

type BrandLockupViewProps = {
  roleTitle: string;
  roleLetterSpacing?: string;
  logoSrc: string;
  logoAlt?: string;
  roleTitleClassName?: string;
  variant?: "app" | "og";
};

const BrandLockupView = ({
  roleTitle,
  roleLetterSpacing,
  logoSrc,
  logoAlt = "BB Logo",
  roleTitleClassName,
  variant = "app",
}: BrandLockupViewProps) => {
  const resolvedRoleTitle = roleTitle.trim();
  const isOg = variant === "og";

  return (
    <div className={styles.root} style={isOg ? OG_ROOT_STYLE : undefined}>
      <img
        src={logoSrc}
        alt={logoAlt}
        className={styles.logo}
        style={isOg ? OG_LOGO_STYLE : undefined}
      />
      <div className={styles.text} style={isOg ? OG_TEXT_STYLE : undefined}>
        <div className={styles.name} style={isOg ? OG_NAME_STYLE : undefined}>
          <span style={isOg ? OG_FIRST_NAME_STYLE : undefined}>BRADLEY</span>
          <span style={isOg ? OG_LAST_NAME_STYLE : undefined}>BAYSINGER</span>
        </div>
        <div style={isOg ? OG_ROLE_CONTAINER_STYLE : undefined}>
          <span
            className={clsx(styles.roleTitle, roleTitleClassName)}
            style={{
              ...(isOg ? OG_ROLE_TITLE_STYLE : undefined),
              letterSpacing: roleLetterSpacing,
            }}
          >
            {resolvedRoleTitle}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BrandLockupView;
