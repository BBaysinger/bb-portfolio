import styles from "./Greeting.module.scss";

import useInViewAnimation from "hooks/useInViewAnimation";
import MagneticThingy from "components/home-page/MagneticThingy";

/**
 * The "Hello" section on the home page.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Greeting: React.FC = () => {
  const addToRefs = useInViewAnimation("in-view");

  return (
    <div id="hello" className={styles.greeting}>
      <div className={styles.greetingWrapper}>
        <div className={styles.helloSignWrapper}>
          <MagneticThingy className={styles.helloSign}>
            <img src="/images/home/hello.webp" alt="hello" loading="lazy" />
          </MagneticThingy>
        </div>

        <div>
          <div className={styles.text}>
            <div ref={addToRefs}>
              <p>
                Hi, I'm Bradley—an interactive developer with a background in
                design, specializing in high-quality, animated web experiences.
                My recent expertise lies in TypeScript, JavaScript, and modern
                front-end development, with a focus on performance, scalability,
                and usability.
              </p>
            </div>
            <div ref={addToRefs}>
              <p>
                This portfolio includes a range of work—from early projects
                built with vanilla ES5, Flash, jQuery, and Haxe, to recent
                builds in React and modern interactive frameworks. While some
                legacy projects reflect the tools of their time, my direction
                today is focused on modern, performant interfaces. Please
                explore—and if you'd like to connect, let's talk!
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
