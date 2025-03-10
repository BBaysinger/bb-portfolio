import styles from "./Greeting.module.scss";

import useInViewAnimation from "hooks/useInViewAnimation";

/**
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Greeting: React.FC = () => {
  const addToRefs = useInViewAnimation("in-view");

  return (
    <div id="hello" className={styles["greeting"]}>
      <div className={styles["greeting-wrapper"]}>
        <div className={`${styles["sign-wrapper"]}`}>
          <img
            ref={addToRefs}
            src="/images/home/road-sign-mobile.webp"
            className={styles["road-sign-mobile"]}
            alt="road sign"
          />
          <img
            ref={addToRefs}
            src="/images/home/road-sign-desktop.webp"
            className={styles["road-sign-desktop"]}
            alt="road sign"
          />
        </div>

        <div className={``}>
          <div className={`${styles["text"]}`}>
            <div ref={addToRefs}>
              <p>
                Hi, I'm Bradley. Welcome to my portfolio site. I'm a front-end
                web developer with a background in design, specializing in
                building high-quality, interactive web experiences. My current
                expertise lies in TypeScript, JavaScript, and modern development
                practices, with a focus on performance, scalability, and
                usability.
              </p>

              {/* <p>
                With years in crafting digital experiences, I take a thoughtful
                approach to every project—balancing aesthetics with
                functionality to create seamless user experiences. Whether it's
                a dynamic web application, a pixel-perfect UI, or a custom-built
                component, I strive to write clean, maintainable code that
                brings designs to life.
                </p> */}
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
              3. Take a look!
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Greeting;
