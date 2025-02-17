import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";

import NavLinks from "./NavLinks";
import styles from "./Footer.module.scss"; // Assuming you're using SCSS modules

/**
 * As you may have guessed, this is the footer, common to every page.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Footer: React.FC = () => {
  const [emailAddr, setEmailAddr] = useState<string>("Waiting...");
  // const [portfolioLinkActive] = useState<boolean>(true);

  useEffect(() => {
    // A dumb trick so that crawlers don't scrape my email address
    const e1 = "B";
    const e2 = "Baysinger";
    const e3 = "@";
    const e4 = "gmx.com";

    const timeout = setTimeout(() => {
      setEmailAddr(e1 + e2 + e3 + e4);
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <footer>
      <div className={`container ${styles["footer-container"]}`}>
        <div className="row">
          <div
            className={`col-xs-12 col-sm-12 col-md-6 col-lg-6 ${styles["footer-cell"]}`}
          >
            <p>
              <img
                src="/images/footer/bb2.jpg"
                className={`img-responsive ${styles["footer-photo"]}`}
                alt="Bradley's face"
              />
              Thanks for stopping by! My site is a work in progress, so you may
              run into a few issues. If you spot anything, please let me know.
              That said, I'm glad you're here! I'm always looking to collaborate
              with forward-thinking teams who value engaging, high-quality
              digital experiences. I look forward to connecting and exploring
              how I can bring unique interactive work to your organization.
            </p>
          </div>

          <div
            className={`col-xs-12 col-sm-12 col-md-4 col-lg-4 ${styles["footer-cell"]} ${styles["contact"]}`}
          >
            <div>
              <ul>
                <li>
                  <a href={`mailto:${emailAddr}`}>
                    <div
                      style={{
                        backgroundImage: "url(/images/footer/icons/email.png)",
                      }}
                    ></div>
                    {emailAddr}
                  </a>
                </li>
                <li>
                  <a href="tel:+15092798603">
                    <div
                      style={{
                        backgroundImage: "url(/images/footer/icons/phone.png)",
                      }}
                    ></div>
                    509-279-8603
                  </a>
                </li>
                <li>
                  <a
                    href="http://www.linkedin.com/in/BBaysinger"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles["nobr"]}>
                      <div
                        style={{
                          backgroundImage:
                            "url(/images/footer/icons/linkedin.png)",
                        }}
                      ></div>
                      linkedin.com/in/BBaysinger
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/BBaysinger"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div
                      style={{
                        backgroundImage: "url(/images/footer/icons/github.png)",
                      }}
                    ></div>
                    github.com/BBaysinger
                  </a>
                </li>
                <li>
                  <a
                    href="https://stackoverflow.com/u/1253298"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div
                      style={{
                        backgroundImage:
                          "url(/images/footer/icons/stackoverflow.png)",
                      }}
                    ></div>
                    stackoverflow.com/u/1253298
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.google.com/maps/place/Spokane,+WA/@47.6727552,-117.552233,11z/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div
                      style={{
                        backgroundImage:
                          "url(/images/footer/icons/location.png)",
                      }}
                    ></div>
                    Spokane, WA{" "}
                    <span className={styles["not-a-suburb"]}>
                      (<i>not</i> near Seattle)
                    </span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div
            className={`col-xs-12 col-sm-12 col-md-2 col-lg-2 ${styles["footer-cell"]} ${styles["footer-nav"]}`}
          >
            <NavLinks />
          </div>
        </div>
      </div>
      <div className={styles["copyright"]}>
        <div className={styles["react"]}>
          <a
            href="https://github.com/BBaysinger/bb-portfolio"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/images/footer/react.svg" alt="React Logo" />
            Built with React
          </a>
        </div>
        <NavLink className={styles["footer-link"]} to="/portfolio#headerMain">
          &copy; <span style={{ color: "#fff" }}>BBInteractive</span>.io
        </NavLink>
      </div>
    </footer>
  );
};

export default Footer;
