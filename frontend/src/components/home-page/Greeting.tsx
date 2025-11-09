"use client";

import { RawImg } from "@/components/common/RawImg";
import MagneticThingy from "@/components/home-page/MagneticThingy";
import useInViewAnimation from "@/hooks/useInViewAnimation";

import styles from "./Greeting.module.scss";

/**
 * The "Hello" section on the home page.
 *
 */
const Greeting: React.FC = () => {
  const addToRefs = useInViewAnimation("in-view");

  return (
    <div id="hello" className={styles.greeting} data-nav="hello">
      <div className={styles.greetingWrapper}>
        <div className={styles.helloSignWrapper}>
          <MagneticThingy className={styles.helloSign}>
            <RawImg
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
                {/* Hi, I&apos;m Bradley—an interactive developer with a background
                in design, specializing in high-quality, animated web
                experiences. I specialize in TypeScript, JavaScript, and modern
                front-end development, with a focus on performance, scalability,
                and usability. */}
                Hi, I'm Bradley — an interactive developer who builds fast,
                animated, design-driven web experiences with TypeScript and
                modern front-end tech. I sure hope you like dark mode. At least
                for the time being!
              </p>
            </div>

            <div ref={addToRefs}>
              <p>
                This site is always under <span>construction</span>
                {/* This portfolio spans projects from early interfaces in Flash,
                jQuery, and Haxe to modern builds in React and contemporary
                frameworks. I've kept some older pieces because I'm still proud
                of what they accomplished with the tools of the time. They
                represent a throughline I've carried into today's fluid, dynamic
                interfaces. Please explore—and reach out if
                something&nbsp;resonates. */}
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
