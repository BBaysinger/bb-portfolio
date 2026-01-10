import clsx from "clsx";
import Link from "next/link";
import React, { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { RawImg } from "@/components/common/RawImg";
import Hamburger from "@/components/layout/Hamburger";
import useLayoutMonitor from "@/hooks/useLayoutMonitor";
import { RootState } from "@/store/store";
import { closeMobileNav } from "@/store/uiSlice";

import NavLinks from "./NavLinks";
import { NavVariants, NavVariantClass } from "./NavVariant.constants";
import styles from "./NavVariant.module.scss";

interface NavProps {
  variant: NavVariantClass;
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
const NAV_HAMBURGER_BREAKPOINT_VAR = "--nav-hamburger-breakpoint";

const NavVariant: React.FC<NavProps> = ({ variant }) => {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );

  const dispatch = useDispatch();
  const navLinksRef = useRef<HTMLUListElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const transitionRestoreTimeoutRef = useRef<number | null>(null);
  const lastIsAboveHamburgerRef = useRef<boolean | null>(null);

  const measureNavLinks = useCallback(() => {
    if (variant !== NavVariants.TOP_BAR) return;
    if (typeof window === "undefined") return;

    const listEl = navLinksRef.current;
    if (!listEl) return;

    const inlineSize = listEl.scrollWidth;
    if (inlineSize <= 0) return;

    const compactWidth = `${Math.ceil(inlineSize)}px`;
    navRef.current?.style.setProperty(
      "--nav-links-compact-width",
      compactWidth,
    );
  }, [variant]);

  const scheduleMeasure = useCallback(() => {
    if (variant !== NavVariants.TOP_BAR) return;
    if (typeof window === "undefined") return;

    if (rafIdRef.current) {
      window.cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      measureNavLinks();
    });
  }, [measureNavLinks, variant]);

  // Measure intrinsic nav width so CSS can animate between compact and full states.
  useEffect(() => {
    scheduleMeasure();

    return () => {
      if (rafIdRef.current) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scheduleMeasure]);

  useLayoutMonitor(navLinksRef, () => {
    scheduleMeasure();
  });

  const getHamburgerBreakpointValue = useCallback(() => {
    if (typeof window === "undefined") return null;
    const preferredTarget = navRef.current ?? document.documentElement;
    const styles = window.getComputedStyle(preferredTarget);
    let rawValue = styles.getPropertyValue(NAV_HAMBURGER_BREAKPOINT_VAR).trim();

    if (!rawValue && preferredTarget !== document.documentElement) {
      const rootStyles = window.getComputedStyle(document.documentElement);
      rawValue = rootStyles
        .getPropertyValue(NAV_HAMBURGER_BREAKPOINT_VAR)
        .trim();
    }

    if (!rawValue) return null;

    const numeric = Number.parseFloat(rawValue);
    if (Number.isNaN(numeric)) return null;

    if (rawValue.endsWith("rem")) {
      const rootFontSize = Number.parseFloat(styles.fontSize || "16");
      return numeric * (Number.isNaN(rootFontSize) ? 16 : rootFontSize);
    }

    if (rawValue.endsWith("vw")) {
      return (numeric / 100) * window.innerWidth;
    }

    return numeric;
  }, []);

  const temporarilyDisableWidthTransition = useCallback(() => {
    if (variant !== NavVariants.TOP_BAR) return;
    if (typeof window === "undefined") return;

    const navEl = navRef.current;
    if (!navEl) return;

    navEl.style.setProperty("transition", "none");

    if (transitionRestoreTimeoutRef.current) {
      window.clearTimeout(transitionRestoreTimeoutRef.current);
    }

    transitionRestoreTimeoutRef.current = window.setTimeout(() => {
      if (!navRef.current) return;
      navRef.current.style.removeProperty("transition");
      transitionRestoreTimeoutRef.current = null;
    }, 500);
  }, [variant]);

  useEffect(() => {
    if (variant !== NavVariants.TOP_BAR) return;
    if (typeof window === "undefined") return;

    const evaluateBreakpoint = () => {
      const breakpointPx = getHamburgerBreakpointValue();
      if (breakpointPx === null) return;

      const isAboveBreakpoint = window.innerWidth >= breakpointPx;

      if (lastIsAboveHamburgerRef.current === null) {
        lastIsAboveHamburgerRef.current = isAboveBreakpoint;
        return;
      }

      if (isAboveBreakpoint !== lastIsAboveHamburgerRef.current) {
        lastIsAboveHamburgerRef.current = isAboveBreakpoint;
        temporarilyDisableWidthTransition();
        scheduleMeasure();
      }
    };

    evaluateBreakpoint();

    window.addEventListener("resize", evaluateBreakpoint);

    return () => {
      window.removeEventListener("resize", evaluateBreakpoint);
    };
  }, [
    getHamburgerBreakpointValue,
    scheduleMeasure,
    temporarilyDisableWidthTransition,
    variant,
  ]);

  useEffect(() => {
    const navElement = navRef.current;

    return () => {
      if (transitionRestoreTimeoutRef.current) {
        window.clearTimeout(transitionRestoreTimeoutRef.current);
        transitionRestoreTimeoutRef.current = null;
      }

      navElement?.style.removeProperty("transition");
    };
  }, []);

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
      ref={navRef}
      id={navId}
      aria-label={isSlideOut ? "Mobile navigation" : "Primary navigation"}
      className={clsx(styles.navVariant, variant, {
        enabled: isMenuOpen,
        disabled: !isMenuOpen,
      })}
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
              UI / Front-end Developer
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
        listRef={variant === NavVariants.TOP_BAR ? navLinksRef : undefined}
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
