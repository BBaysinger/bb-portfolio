"use client";

// import Link from "next/link";

import { RawImg } from "@/components/common/RawImg";
import MagneticThingy from "@/components/home-page/MagneticThingy";
import useInViewAnimation from "@/hooks/useInViewAnimation";

import styles from "./Greeting.module.scss";

type GreetingProps = {
  introHtml: string;
  bodyHtml: string;
};

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
const Greeting: React.FC<GreetingProps> = ({ introHtml, bodyHtml }) => {
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
              <div
                className={styles.copyHtml}
                dangerouslySetInnerHTML={{ __html: introHtml }}
              />
            </div>
            <div ref={addToRefs}>
              <div
                className={styles.copyHtml}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
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
