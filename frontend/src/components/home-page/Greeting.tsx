"use client";

// import Link from "next/link";

import { RawImg } from "@/components/common/RawImg";
import MagneticThingy from "@/components/home-page/MagneticThingy";
import useInViewAnimation from "@/hooks/useInViewAnimation";

import styles from "./Greeting.module.scss";

/**
 * Hello section component for the home page
 *
 * Displays the main greeting section with personal introduction, hello sign,
 * and call-to-action. Features magnetic interaction on the hello sign and
 * progressive animation as elements come into view.
 *
 * @component
 *
 * @example
 * ```tsx
 * <Greeting />
 * ```
 *
 * Features:
 * - Magnetic hello sign with interactive hover effects
 * - Progressive reveal animations using intersection observer
 * - Accessible navigation anchor (id="hello")
 * - Responsive layout adapting to different screen sizes
 * - Personal introduction and portfolio navigation link
 *
 * Navigation:
 * - Links to #projects-list for portfolio exploration
 * - Provides data-nav="hello" for scroll-based navigation
 */
const Greeting: React.FC = () => {
  const addToRefs = useInViewAnimation("in-view");

  return (
    <div id="hello" className={styles.greeting} data-nav="hello">
      <div className={styles.greetingWrapper}>
        <div ref={addToRefs} className={styles.helloSignWrapper}>
          <MagneticThingy className={styles.helloSign}>
            <RawImg
              src="/images/hello/hello.webp"
              alt="hello"
              className={styles.helloImage}
            />
          </MagneticThingy>
        </div>

        <div>
          <div className={styles.infoSection}>
            <div ref={addToRefs}>
              <p>
                Hi, I'm Bradley — a <strong>UI</strong> and{" "}
                <strong>front-end developer</strong> in Spokane, WA. I've spent
                years building interaction-heavy front-end projects. This site
                focuses on the polish and sophistication I bring to my work, and
                it includes some legacy projects for context.
              </p>
            </div>
            <div ref={addToRefs}>
              <p>
                While much of my background is in interaction-heavy front-end
                work, my current focus is both broadening and deepening my
                front-end foundation—shipping and maintaining reliable product
                UI, strengthening core patterns around structure, styling, and
                behavior, and applying the same level of care and polish to
                everyday interfaces.
              </p>
            </div>
            <a
              ref={addToRefs}
              className={styles.lookLink}
              href="#projects-list"
            >
              <div>Scope Projects!</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Greeting;
