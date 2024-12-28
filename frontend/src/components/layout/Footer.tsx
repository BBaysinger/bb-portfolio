import React, { useState, useEffect } from "react";

import MiscUtils from "utils/MiscUtils";
import { NavLink } from "react-router-dom";
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
              Thanks for the visit! My site is under heavy development atm, so
              there may be some issues. It's really just a start, I have big
              plans. Please let me know if you encounter any problems. In any
              case, I look forward to speaking with you about how I can bring
              unique interactive experience to your&nbsp;organization.
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
                    Spokane, WA
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
            <ul>
              <li>
                <NavLink
                  className={({ isActive }) =>
                    MiscUtils.isActiveOrAlt(isActive, "/", styles["active"])
                  }
                  to="/portfolio#list"
                >
                  Portfolio
                </NavLink>
              </li>
              <li>
                <NavLink
                  className={({ isActive }) =>
                    isActive ? styles["active"] : ""
                  }
                  to="/cv#headerSub"
                >
                  CV
                </NavLink>
              </li>
            </ul>
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
