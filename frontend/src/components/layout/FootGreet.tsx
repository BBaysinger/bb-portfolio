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
        {greeting}, and thanks for stopping by! I'll be honest—this space is an
        experiment in progress, and I hope it always stays that way. Some things
        might seem a bit mysterious, but give it time and check back later!
      </p>
      <p>
        Anyhow, I'm always looking to collaborate with forward-thinking teams
        who value engaging digital experiences. I look forward to connecting and
        exploring how I can bring unique interactive work to your organization.
      </p>
    </>
  );
};

export default FootGreet;
