import type { ServerBrandingLockup } from "@/data/BrandingLockup";

import BrandLockupView from "./BrandLockupView";

const LOGO_SRC = "/images/hero/bb-logo.svg";
const LOGO_ALT = "BB Logo";
type BrandLockupProps = {
  branding: ServerBrandingLockup;
};

const BrandLockup = ({ branding }: BrandLockupProps) => {
  if (!branding.activeRoleTitleClassName) {
    throw new Error("Branding lockup missing activeRoleTitleClassName.");
  }

  return (
    <BrandLockupView
      roleTitle={branding.activeRoleTitle}
      roleTitleStyle={branding.activeRoleTitleClassName}
      logoSrc={LOGO_SRC}
      logoAlt={LOGO_ALT}
      roleTitleClassName="nobr"
      layout="bare"
    />
  );
};

export default BrandLockup;
