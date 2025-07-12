import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";

import styles from "./Footer.module.scss";
import FootGreet from "./FootGreet";
import Links from "./NavLinks";

type FooterProps = {
  mutationElemRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * The footer, common to every page.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Footer: React.FC<FooterProps> = ({ mutationElemRef }) => {
  const [mainContentHeight, setMainContentHeight] = useState(9999999999);
  const [footerHeight, setFooterHeight] = useState(0);
  const [shouldSnap, setShouldSnap] = useState(false);

  const footerRef = useRef<HTMLDivElement>(null);
  const [emailAddr, setEmailAddr] = useState<string>("Waiting...");

  const pathname = usePathname();
  const prevPathRef = useRef<string>(pathname);

  // Obfuscated email setup
  useEffect(() => {
    const timeout = setTimeout(() => {
      setEmailAddr("B" + "Baysinger" + "@" + "gmx.com");
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

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

    const updateFooterHeight = () => {
      const height = footerTarget.offsetHeight || 0;
      setFooterHeight(height);
    };

    requestAnimationFrame(() => {
      updateMainContentHeight();
      updateFooterHeight();
    });

    const mainContentResizeObserver = new ResizeObserver(() => {
      updateMainContentHeight();
    });

    mainContentResizeObserver.observe(mainContentTarget);

    const footerResizeObserver = new ResizeObserver(() => {
      updateFooterHeight();
    });

    footerResizeObserver.observe(footerTarget);

    return () => {
      mainContentResizeObserver.disconnect();
      footerResizeObserver.disconnect();
    };
  }, [mutationElemRef]);

  return (
    <div
      className={styles.footerWrapper}
      style={{
        height: `${Math.round(footerHeight) - 1}px`,
      }}
    >
      <footer
        ref={footerRef}
        style={{
          transform: `translateY(${Math.round(mainContentHeight)}px)`,
          transition: shouldSnap ? "none" : "transform 0.4s ease-in-out",
        }}
        className={styles.footer}
      >
        <div className="container">
          <div className="row">
            <div
              className={`col-xs-12 col-sm-12 col-md-6 col-lg-6 ${styles.footerCell}`}
            >
              <FootGreet className={""} />
            </div>

            <div
              className={`col-xs-12 col-sm-12 col-md-4 col-lg-4 ${styles.footerCell} ${styles.contact}`}
            >
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

            <div
              className={`col-xs-12 col-sm-12 col-md-2 col-lg-2 ${styles.footerCell} ${styles.footerNav}`}
            >
              <Links />
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
              <Image src="/images/footer/react.svg" alt="React Logo" />
              Built with React
            </a>
          </div>
          <Link className={styles.footerLink} href="/portfolio#top">
            &copy; <span style={{ color: "#fff" }}>BBInteractive</span>.io
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
