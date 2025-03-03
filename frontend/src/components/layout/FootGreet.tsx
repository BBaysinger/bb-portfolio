import { useState, useEffect } from "react";

import styles from "./FootGreet.module.scss";

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const FootGreet: React.FC<{ className: string }> = ({ className }) => {
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000); // Update every minute in case the time of day changes.

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <p className={className}>
        <img
          src="/images/footer/bb2.jpg"
          className={`img-responsive ${styles["footer-photo"]}`}
          alt="Bradley's face"
        />
        {greeting}, and thanks for stopping by! This site is a recent overhaul
        with some huge improvements. I'll always be experimenting with UI
        concepts here, as I'm overflowing with ideas, but never enough time to
        do them all.
      </p>
      <p>
        That said, I'm glad you're here! I'm always looking to collaborate with
        forward-thinking teams who value engaging digital experiences. I look
        forward to connecting and exploring how I can bring unique interactive
        work to your organization.
      </p>
    </>
  );
};

export default FootGreet;
