import Image from "next/image";

import useTimeOfDay from "@/hooks/useTimeOfDay";

import styles from "./FootGreet.module.scss";

/**
 * The greeting in the footer.
 * Time of day included for a subtle dynamic touch.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FootGreet: React.FC<{ className: string }> = ({ className }) => {
  const currentTimeOfDay = useTimeOfDay(); // live value from the hook

  return (
    <>
      <p className={className}>
        <Image
          src="/images/footer/bb2.jpg"
          className={`img-responsive ${styles.footerPhoto}`}
          alt="Bradley's face"
        />
        Good {currentTimeOfDay}, and thanks for stopping by! I&apos;ll be
        honest—this space is an experiment in progress, and I hope it always
        stays that way. Some things might seem a bit mysterious, but give it
        time and check back later!
      </p>
      <p>
        Anyhow, I&apos;m always looking to collaborate with forward-thinking
        teams who value engaging digital experiences. I look forward to
        connecting and exploring how I can bring unique interactive work to your
        organization.
      </p>
    </>
  );
};

export default FootGreet;
