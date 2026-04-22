import type { CSSProperties, ReactNode } from "react";

type BrandLockupProps = {
  roleTitle: string;
  roleLetterSpacing?: string;
  logoSrc?: string;
  logoNode?: ReactNode;
  logoAlt?: string;
  scale?: number;
  style?: CSSProperties;
  logoStyle?: CSSProperties;
  firstNameColor?: string;
  lastNameColor?: string;
  roleColor?: string;
  dropShadow?: string;
};

const BASE_LOGO_HEIGHT = 38;
const BASE_NAME_FONT_SIZE = 24;
const BASE_ROLE_WRAP_FONT_SIZE = 13.9;
const BASE_ROLE_FONT_SIZE = 16;
const BASE_GAP = 8;
const LIGHTER_THEME_COLOR = "rgba(141, 181, 40, 1)";

const BrandLockup = ({
  roleTitle,
  roleLetterSpacing,
  logoSrc,
  logoNode,
  logoAlt = "BB Logo",
  scale = 1,
  style,
  logoStyle: logoStyleOverride,
  firstNameColor = "#999",
  lastNameColor = LIGHTER_THEME_COLOR,
  roleColor = "#fff",
  dropShadow,
}: BrandLockupProps) => {
  const resolvedRoleTitle = roleTitle.trim();
  const rootStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: BASE_GAP * scale,
    color: roleColor,
    ...style,
  };

  const resolvedLogoStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    maxHeight: BASE_LOGO_HEIGHT * scale,
    height: "auto",
    width: "auto",
    flexShrink: 0,
    position: "relative",
    top: "50%",
    transform: "translateY(-50%)",
    ...(dropShadow ? { filter: dropShadow } : {}),
    ...logoStyleOverride,
  };

  const textColumnStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  };

  const nameRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    gap: 0,
    textTransform: "uppercase",
    lineHeight: 1,
    fontWeight: 400,
    fontSize: BASE_NAME_FONT_SIZE * scale,
    letterSpacing: 0,
    whiteSpace: "nowrap",
    marginTop: -3 * scale,
    marginBottom: -7 * scale,
  };

  const roleWrapStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    fontSize: BASE_ROLE_WRAP_FONT_SIZE * scale,
    color: roleColor,
    marginTop: -3 * scale,
    marginBottom: -2 * scale,
    lineHeight: 1,
  };

  const roleTextStyle: CSSProperties = {
    display: "block",
    fontSize: BASE_ROLE_FONT_SIZE * scale,
    color: roleColor,
    marginLeft: 1 * scale,
    letterSpacing: roleLetterSpacing,
    whiteSpace: "nowrap",
    lineHeight: 1,
  };

  return (
    <div style={rootStyle}>
      {logoNode ? (
        <div aria-hidden="true" style={resolvedLogoStyle}>
          {logoNode}
        </div>
      ) : (
        <img src={logoSrc} alt={logoAlt} style={resolvedLogoStyle} />
      )}
      <div style={textColumnStyle}>
        <div style={nameRowStyle}>
          <span style={{ color: firstNameColor, marginRight: -2 * scale }}>
            Bradley
          </span>
          <span style={{ color: lastNameColor }}>Baysinger</span>
        </div>
        <div style={roleWrapStyle}>
          <span style={roleTextStyle}>{resolvedRoleTitle}</span>
        </div>
      </div>
    </div>
  );
};

export default BrandLockup;
