"use client";

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
                Hi, I&apos;m Bradley—an interactive developer with a background
                in design, specializing in high-quality, animated web
                experiences. My recent expertise lies in TypeScript, JavaScript,
                and modern front-end development, with a focus on performance,
                scalability, and usability.
              </p>
            </div>
            <div ref={addToRefs}>
              <p>
                My portfolio spans projects from early interfaces in Flash,
                jQuery, and Haxe to modern builds in React and contemporary
                frameworks. I've kept some older pieces because I'm still proud
                of what they accomplished with the tools of the time. They
                represent a throughline I've carried into today's fluid, dynamic
                interfaces. Please explore—and reach out if
                something&nbsp;resonates.
              </p>
            </div>
            <a ref={addToRefs} href="#projects-list">
              <div>Take a look!</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Greeting;
