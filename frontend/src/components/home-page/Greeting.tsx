import styles from "./Greeting.module.scss";

/**
 *
 */
const Greeting: React.FC = () => {
  return (
    <div className={styles["greeting"]}>
      <div className="container">
        <p>
          Hi, I'm Bradley. I'm a front-end web developer with a background in
          design, specializing in building high-quality, interactive web
          experiences. My current expertise lies in TypeScript, JavaScript, and
          modern development practices, with a focus on performance,
          scalability, and usability.
        </p>

        <p>
          With years in crafting digital experiences, I take a thoughtful
          approach to every project—balancing aesthetics with functionality to
          create seamless user experiences. Whether it's a dynamic web
          application, a pixel-perfect UI, or a custom-built component, I strive
          to write clean, maintainable code that brings designs to life.
        </p>

        <p>
          My portfolio includes both modern projects and select legacy pieces,
          highlighting my unique history, adaptability, and attention to detail.
          These showcase not only my technical evolution but also my ability to
          refine and polish digital experiences across different eras of web
          development. Feel free to browse my work, and if you'd like to
          connect, let's talk!
        </p>
      </div>
    </div>
  );
};

export default Greeting;
