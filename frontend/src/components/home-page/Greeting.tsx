"use client";

import Link from "next/link";

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
        <div className={styles.helloSignWrapper}>
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
                many years building interaction-heavy front-end projects. This
                site focuses on the polish and sophistication I bring to my
                work, and it includes some legacy projects for context.
              </p>
            </div>
            <div ref={addToRefs}>
              <p>
                My current focus is working more deeply in foundational
                front-end work&mdash;shipping and maintaining reliable UI with
                strong HTML, CSS, and JavaScript&mdash;while bringing the same
                level of care to everyday product interfaces. Please take a look
                around, and if something resonates, please{" "}
                <Link href="/contact">reach out!</Link>
              </p>
            </div>
            <a
              ref={addToRefs}
              className={styles.lookLink}
              href="#projects-list"
            >
              <div>Take a look!</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Greeting;
