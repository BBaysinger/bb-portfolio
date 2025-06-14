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
                Hi, I'm Bradley and I'm an interactive developer with a
                background in design, specializing in building high-quality,
                interactive web experiences. My current expertise lies in
                TypeScript, JavaScript, and modern development practices, with a
                focus on performance, scalability, and usability.
              </p>
            </div>
            <div ref={addToRefs}>
              <p>
                My portfolio includes both modern projects and select legacy
                pieces, highlighting my unique history, adaptability, and
                attention to detail. These showcase not only my technical
                evolution but also my ability to refine and polish digital
                experiences across different eras of web development. Feel free
                to browse my work, and if you'd like to connect, let's talk!
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
