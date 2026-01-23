import clsx from "clsx";
import React, { useRef } from "react";

import { useFlipInFlow } from "@/hooks/useFlipInFlow";

import styles from "./Footer.module.scss";
import FooterContactList from "./FooterContactList";
import FootGreet from "./FootGreet";
import NavLinks from "./NavLinks";

type FooterProps = {
  mutationElemRef: React.RefObject<HTMLDivElement | null>;
  className?: string | undefined;
};

/**
 * The page footer, common to every page, but *positioned dynamically* to optimize
 * smooth transitions in the project carousel. Since project info/text can vary in height,
 * we dynamically position the footer to eliminate large blank spaces on projects with
 * less content. This creates a smooth, continuous experience as users navigate between
 * projects without jarring "jumps" in the UI.
 *
 * **Performance Strategy:**
 * - Uses CSS custom properties (--translateX, --translateY) with separate transition timing
 * - Detects main content height via ResizeObserver for responsive positioning
 * - Wraps footer in a statically positioned container that reserves natural footer height
 * - Uses GPU-accelerated transforms for smooth animations
 *
 * The footer responds to mobile navigation state via CSS global classes, sliding
 * horizontally alongside the main content when the mobile menu is expanded. The X and Y
 * transforms use independent timing for optimal animation feel.
 *
 * It should be pointed out here that this solution might not be ideal for pages where
 * the dynamic content is followed by a lot of content before the footer, as that's a
 * lot more content to shift around with CSS transforms. However, for this portfolio site,
 * where the footer is directly below the dynamic content, this approach works (extremely)
 * well.
 */
const Footer: React.FC<FooterProps> = ({ className, mutationElemRef }) => {
  const footerRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  useFlipInFlow(mutationElemRef, footerRef);

  return (
    <footer ref={footerRef} className={clsx(className, styles.footer)}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={clsx(styles.footerCell, styles.greetSection)}>
            <FootGreet />
          </div>

          <div className={clsx(styles.footerCell, styles.contact)}>
            <FooterContactList />
          </div>

          <div className={clsx(styles.footerCell, styles.footerNav)}>
            <NavLinks
              className={styles.footerNavLinks}
              variant="footer"
              ariaLabel="Footer navigation"
            />
          </div>
        </div>
      </div>
      <div className={styles.copyright}>
        <div className={styles.builtIn}>
          <a
            href="https://github.com/bbaysinger/bb-portfolio"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* <RawImg src="/images/footer/react.svg" alt="React Logo" /> */}
            Next.js<span>&bull;</span>Payload CMS<span>&bull;</span>TypeScript
          </a>
        </div>
        <a
          className={styles.footerLink}
          href="/"
        >
          &copy; {currentYear} <span style={{ color: "#fff" }}>Bradley Baysinger</span>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
