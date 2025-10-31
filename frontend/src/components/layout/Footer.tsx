import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";

import { RawImg } from "@/components/common/RawImg";
import { useContactEmail } from "@/hooks/useContactEmail";

import styles from "./Footer.module.scss";
import FootGreet from "./FootGreet";
import NavLinks from "./NavLinks";

type FooterProps = {
  mutationElemRef: React.RefObject<HTMLDivElement | null>;
  className: string | undefined;
  transitionSegment: string | undefined;
};

/**
 * The page footer, common to every page, but *positioned dynamically* to optimize
 * smooth transitions in the project carousel. Since project info/text can vary in height,
 * we dynamically position the footer to eliminate large blank spaces on projects with
 * less content. This creates a smooth, continuous experience as users navigate between
 * projects without jarring "jumps" in the UI.
 *
 * **Performance Strategy:**
 * - Uses `transform: translateY()` instead of `top` property changes to avoid layout jank
 * - Detects main content height via ResizeObserver for responsive positioning
 * - Wraps footer in a statically positioned container that reserves natural footer height
 * - Leverages GPU-accelerated transforms for 60fps smooth animations
 *
 * The footer also responds to mobile navigation state via the `navRevelator` (from the
 * parent) class pattern, sliding horizontally alongside the main content when the mobile
 * menu is expanded.
 *
 * It should be pointed out here that this solution might not be ideal for pages where
 * the dynamic content is followed by a lot of content before the footer, as that's a
 * lot more content to shift around with CSS transforms. However, for this portfolio site,
 * where the footer is directly below the dynamic content, this approach works (extremely)
 * well.
 */
const Footer: React.FC<FooterProps> = ({
  mutationElemRef,
  className,
  transitionSegment,
}) => {
  const [mainContentHeight, setMainContentHeight] = useState(9999999999);
  const [shouldSnap, setShouldSnap] = useState(false);

  const footerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const prevPathRef = useRef<string>(pathname);

  // Enhanced obfuscated email setup - fetches from environment variables
  const {
    email: emailAddr,
    isLoading: _emailLoading,
    error: _emailError,
  } = useContactEmail();

  useEffect(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;

    const wasPortfolioSlug = /^\/portfolio\/[^/]+$/.test(prevPath);
    const isPortfolioSlug = /^\/portfolio\/[^/]+$/.test(currentPath);

    const isSmooth = wasPortfolioSlug && isPortfolioSlug;
    setShouldSnap(!isSmooth); // Only suppress snapping if both are slugs

    prevPathRef.current = currentPath;
  }, []);

  useEffect(() => {
    const mainContentTarget = mutationElemRef.current;
    const footerTarget = footerRef.current;

    if (!mainContentTarget || !footerTarget) {
      throw new Error("Mutation element or footer element not found");
    }

    const updateMainContentHeight = () => {
      const height = mainContentTarget.offsetHeight || 0;
      setTimeout(() => {
        setMainContentHeight(height);
      }, 50);
    };

    // const updateFooterHeight = () => {
    //   const height = footerTarget.offsetHeight || 0;
    //   const minHeight = window.innerHeight;
    //   setFooterHeight(Math.max(height, minHeight));
    // };

    requestAnimationFrame(() => {
      updateMainContentHeight();
      // updateFooterHeight();
    });

    const mainContentResizeObserver = new ResizeObserver(() => {
      updateMainContentHeight();
    });

    mainContentResizeObserver.observe(mainContentTarget);

    const footerResizeObserver = new ResizeObserver(() => {
      //updateFooterHeight();
    });

    footerResizeObserver.observe(footerTarget);

    const handleWindowResize = () => {
      // updateFooterHeight();
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      mainContentResizeObserver.disconnect();
      footerResizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [mutationElemRef]);

  return (
    <div
      className={clsx(styles.footerWrapper)}
      // style={{
      //   minHeight: `${Math.round(footerHeight) - 1}px`,
      // }}
    >
      <footer
        ref={footerRef}
        style={{
          transform: `translateY(${Math.round(mainContentHeight)}px)`,
          transition: `${shouldSnap ? "none" : "transform 0.4s ease-in-out"}, ${transitionSegment}`,
        }}
        className={clsx(className, styles.footer)}
      >
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={`${styles.footerCell} ${styles.greetSection}`}>
              <FootGreet className={""} />
            </div>

            <div className={`${styles.footerCell} ${styles.contact}`}>
              <div>
                <ul>
                  <li>
                    <a href={`mailto:${emailAddr}`}>
                      <div
                        style={{
                          backgroundImage:
                            "url(/images/footer/icons/email.png)",
                        }}
                      ></div>
                      {emailAddr}
                    </a>
                  </li>
                  <li>
                    <a href="tel:+15092798603">
                      <div
                        style={{
                          backgroundImage:
                            "url(/images/footer/icons/phone.png)",
                        }}
                      ></div>
                      509-279-8603
                    </a>
                  </li>
                  <li>
                    <a
                      href="http://www.linkedin.com/in/BBaysinger"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="nobr">
                        <div
                          style={{
                            backgroundImage:
                              "url(/images/footer/icons/linkedin.png)",
                          }}
                        ></div>
                        linkedin.com/in/BBaysinger
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/BBaysinger"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div
                        style={{
                          backgroundImage:
                            "url(/images/footer/icons/github.png)",
                        }}
                      ></div>
                      github.com/BBaysinger
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://stackoverflow.com/u/1253298"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div
                        style={{
                          backgroundImage:
                            "url(/images/footer/icons/stackoverflow.png)",
                        }}
                      ></div>
                      stackoverflow.com/u/1253298
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.google.com/maps/place/Spokane,+WA/@47.6727552,-117.552233,11z/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div
                        style={{
                          backgroundImage:
                            "url(/images/footer/icons/location.png)",
                        }}
                      ></div>
                      Spokane, WA{" "}
                      <span className={styles.notASuburb}>
                        (<i>not</i> near Seattle)
                      </span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className={`${styles.footerCell} ${styles.footerNav}`}>
              <NavLinks className={styles.footerNavLinks} />
            </div>
          </div>
        </div>
        <div className={styles.copyright}>
          <div className={styles.react}>
            <a
              href="https://github.com/BBaysinger/bb-portfolio"
              target="_blank"
              rel="noopener noreferrer"
            >
              <RawImg src="/images/footer/react.svg" alt="React Logo" />
              Built with React
            </a>
          </div>
          <Link className={styles.footerLink} href="https://bbinteractive.io">
            &copy; <span style={{ color: "#fff" }}>BBInteractive</span>.io
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
