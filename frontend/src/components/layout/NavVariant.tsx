import clsx from "clsx";
import Link from "next/link";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { RawImg } from "@/components/common/RawImg";
import Hamburger from "@/components/layout/Hamburger";
import { RootState } from "@/store/store";
import { closeMobileNav } from "@/store/uiSlice";

import NavLinks from "./NavLinks";
import styles from "./NavVariant.module.scss";

export const NavVariants = {
  TOP_BAR: styles.topBar,
  SLIDE_OUT: styles.slideOut,
} as const;

interface NavProps {
  variant: (typeof NavVariant)[keyof typeof NavVariant];
}

/**
 * Adaptive navigation component with multiple display variants.
 *
 * Renders navigation that adapts between desktop top bar and mobile slide-out
 * menu configurations. Uses different styling variants rather than dynamic
 * switching to maintain performance and avoid layout shifts.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.variant - Navigation display variant (TOP_BAR or SLIDE_OUT)
 *
 * @example
 * ```tsx
 * // Desktop fixed top bar
 * <NavVariant variant={NavVariants.TOP_BAR} />
 *
 * // Mobile slide-out drawer
 * <NavVariant variant={NavVariants.SLIDE_OUT} />
 * ```
 *
 * Features:
 * - Top bar variant for desktop layouts with fixed positioning
 * - Slide-out variant for mobile navigation with decorative shadow layers
 * - Logo and navigation links integration
 * - Redux-connected mobile navigation state
 * - Accessible landmarks with unique labels per variant
 * - Hamburger toggle for mobile menu control
 *
 * Accessibility:
 * - Unique aria-label per variant ("Primary navigation" / "Mobile navigation")
 * - Mobile nav uses id="mobile-nav" for hamburger aria-controls reference
 * - NavLinks rendered as div to avoid nested nav landmarks
 * - Conditional rendering based on variant prevents duplicate DOM elements
 */
const NavVariant: React.FC<NavProps> = ({ variant }) => {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );

  const dispatch = useDispatch();

  /**
   * Closes mobile navigation when a link is clicked
   * Only dispatches action for slide-out variant to avoid unnecessary Redux updates
   */
  const closeMobileNavHandler = () => {
    if (variant === NavVariants.SLIDE_OUT) {
      dispatch(closeMobileNav());
    }
  };

  const isSlideOut = variant === NavVariants.SLIDE_OUT;
  /** Mobile nav ID for aria-controls reference from hamburger button */
  const navId = isSlideOut ? "mobile-nav" : undefined;
  return (
    <nav
      id={navId}
      aria-label={isSlideOut ? "Mobile navigation" : "Primary navigation"}
      className={clsx(styles.navVariant, variant, {
        enabled: isMenuOpen,
        disabled: !isMenuOpen,
      })}
      role="navigation"
    >
      {variant === NavVariants.SLIDE_OUT && (
        <>
          <div className={styles.shadowLayer0}></div>
          <div className={styles.shadowLayer1}></div>
          <div className={styles.shadowLayer2}></div>
        </>
      )}

      <Link href="/#top" className={styles.title}>
        <RawImg
          src={"/images/hero/bb-logo.svg"}
          className={styles.navLogo}
          alt="BB Logo"
        />
        <div className={styles.navLogoText}>
          <div className={styles.name}>
            <span>BRADLEY</span> <span>BAYSINGER</span>
          </div>
          <div>
            <span className={clsx(styles.jobTitle, "nobr")}>
              Interactive UI Developer
            </span>
          </div>
        </div>
      </Link>
      <NavLinks
        onClick={closeMobileNavHandler}
        className={styles.navLinks}
        variant={isSlideOut ? "mobile" : "primary"}
        mobileOpen={isSlideOut ? isMenuOpen : undefined}
        onCloseRequest={isSlideOut ? closeMobileNavHandler : undefined}
        id={isSlideOut ? "mobile-nav-links" : undefined}
        as="div"
      />

      {variant === NavVariants.TOP_BAR && (
        <Hamburger className={styles.hamburger} />
      )}

      {/* <div className={styles.debug}>
        Current Route: {currentPath} <br />
        {isScrolledToTop ? "Scrolled to Top ✅" : "Scrolled Down ❌"}
      </div>  */}
    </nav>
  );
};

export default NavVariant;
