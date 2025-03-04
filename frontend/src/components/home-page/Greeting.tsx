import styles from "./Greeting.module.scss";

/**
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Greeting: React.FC = () => {
  return (
    <div className={styles["greeting"]}>
      <div className={styles["greeting-wrapper"]}>
        <div className="container">
          <div className="row">
            <div
              className={`${styles["sign-wrapper"]} col-xs-12 col-sm-12 col-md-4 col-lg-4`}
            >
              <img
                src="/images/home/road-sign-mobile.webp"
                className={styles["road-sign-mobile"]}
                alt="road sign"
              />
              <img
                src="/images/home/road-sign-desktop.webp"
                className={styles["road-sign-desktop"]}
                alt="road sign"
              />
            </div>

            <div className={`col-xs-12 col-sm-12 col-md-8 col-lg-8`}>
              <div className={`${styles["text"]}`}>
                <p>
                  Hi, I'm Bradley. Welcome to my portfolio site. I'm a front-end
                  web developer with a background in design, specializing in
                  building high-quality, interactive web experiences. My current
                  expertise lies in TypeScript, JavaScript, and modern
                  development practices, with a focus on performance,
                  scalability, and usability.
                </p>

                {/* <p>
                With years in crafting digital experiences, I take a thoughtful
                approach to every project—balancing aesthetics with
                functionality to create seamless user experiences. Whether it's
                a dynamic web application, a pixel-perfect UI, or a custom-built
                component, I strive to write clean, maintainable code that
                brings designs to life.
                </p> */}

                <p>
                  My portfolio includes both modern projects and select legacy
                  pieces, highlighting my unique history, adaptability, and
                  attention to detail. These showcase not only my technical
                  evolution but also my ability to refine and polish digital
                  experiences across different eras of web development. Feel
                  free to browse my work, and if you'd like to connect, let's
                  talk!
                </p>

                <button>Take a look!</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Greeting;
