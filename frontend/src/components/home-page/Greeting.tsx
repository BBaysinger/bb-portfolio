import MagneticThingy from "@/components/home-page/MagneticThingy";
import useInViewAnimation from "@/hooks/useInViewAnimation";

import styles from "./Greeting.module.scss";

/**
 * The "Hello" section on the home page.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
const Greeting: React.FC = () => {
  const addToRefs = useInViewAnimation("in-view");

  return (
    <div id="hello" className={styles.greeting} data-nav="hello">
      <div className={styles.greetingWrapper}>
        <div className={styles.helloSignWrapper}>
          <MagneticThingy className={styles.helloSign}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home/hello.webp"
              alt="hello"
              className={styles.helloImage}
            />
          </MagneticThingy>
        </div>

        <div>
          <div className={styles.text}>
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
                This portfolio includes a range of work—from early projects
                built with vanilla ES5, Flash, jQuery, and Haxe, to recent
                builds in React and modern interactive frameworks. While some
                legacy projects reflect the tools of their time, my direction
                today is focused on modern, performant interfaces. Please
                explore—and if you&apos;d like to connect, let&apos;s talk!
              </p>
            </div>
            <a ref={addToRefs} href="#list">
              <div>Take a look!</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Greeting;
