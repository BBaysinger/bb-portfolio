import styles from "./NavVariant.module.scss";

export const NavVariants = {
  TOP_BAR: styles.topBar,
  SLIDE_OUT: styles.slideOut,
} as const;

export type NavVariantClass = (typeof NavVariants)[keyof typeof NavVariants];
