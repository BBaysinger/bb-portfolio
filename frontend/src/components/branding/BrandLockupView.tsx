import clsx from "clsx";

import styles from "./BrandLockupView.module.scss";

type BrandLockupViewProps = {
  roleTitle: string;
  roleLetterSpacing?: string;
  logoSrc: string;
  logoAlt?: string;
  roleTitleClassName?: string;
  layout?: "wrapped" | "bare";
};

const BrandLockupView = ({
  roleTitle,
  roleLetterSpacing,
  logoSrc,
  logoAlt = "BB Logo",
  roleTitleClassName,
  layout = "wrapped",
}: BrandLockupViewProps) => {
  const resolvedRoleTitle = roleTitle.trim();
  const isBareLayout = layout === "bare";

  const content = (
    <>
      <img src={logoSrc} alt={logoAlt} className={styles.logo} />
      <div className={styles.text}>
        <div className={styles.name}>
          <span>BRADLEY</span> <span>BAYSINGER</span>
        </div>
        <div>
          <span
            className={clsx(styles.roleTitle, roleTitleClassName)}
            style={{ letterSpacing: roleLetterSpacing }}
          >
            {resolvedRoleTitle}
          </span>
        </div>
      </div>
    </>
  );

  if (isBareLayout) {
    return content;
  }

  return <div className={styles.root}>{content}</div>;
};

export default BrandLockupView;
