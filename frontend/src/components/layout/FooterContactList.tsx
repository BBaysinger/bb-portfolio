import clsx from "clsx";

import useDeviceCapabilities from "@/hooks/useDeviceCapabilities";
import { useContactEmail, useContactPhone } from "@/hooks/useObfuscatedContact";

import styles from "./FooterContactList.module.scss";

type FooterContactListProps = {
  className?: string;
};

const FooterContactList: React.FC<FooterContactListProps> = ({ className }) => {
  // Contact info (email/phone) loaded via obfuscated contact endpoint
  const { email: emailAddr, isLoading: emailLoading } = useContactEmail();
  const {
    phoneE164,
    phoneDisplay,
    isLoading: phoneLoading,
  } = useContactPhone();

  // Capability-first detection (avoids UA sniffing)
  const { isTouchPrimary } = useDeviceCapabilities();

  return (
    <div className={clsx(styles.root, className)}>
      <ul className={styles.list}>
        <li className={styles.item}>
          <a href={`mailto:${emailAddr || ""}`}>
            <div
              className={styles.contactIcon}
              style={{ backgroundPositionY: "0px" }}
              aria-hidden="true"
            ></div>
            {emailLoading ? "Loading..." : emailAddr}
          </a>
        </li>

        <li className={styles.item}>
          <a
            href="https://www.linkedin.com/in/bbaysinger"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="nobr">
              <div
                className={styles.contactIcon}
                style={{ backgroundPositionY: "-26px" }}
                aria-hidden="true"
              ></div>
              linkedin.com/in/bbaysinger
            </span>
          </a>
        </li>

        <li className={styles.item}>
          <a
            href="https://github.com/bbaysinger"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div
              className={styles.contactIcon}
              style={{ backgroundPositionY: "-52px" }}
              aria-hidden="true"
            ></div>
            github.com/bbaysinger
          </a>
        </li>

        <li className={styles.item}>
          <a
            href="https://stackoverflow.com/u/1253298"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div
              className={styles.contactIcon}
              style={{ backgroundPositionY: "-78px" }}
              aria-hidden="true"
            ></div>
            stackoverflow.com/u/1253298
          </a>
        </li>

        {(phoneLoading || phoneE164 || phoneDisplay) && (
          <li className={styles.item}>
            <a href={`tel:${phoneE164 || ""}`}>
              <div
                className={styles.contactIcon}
                style={{ backgroundPositionY: "-104px" }}
                aria-hidden="true"
              ></div>
              {phoneLoading ? "Loading..." : phoneDisplay || phoneE164 || ""}
            </a>
          </li>
        )}

        <li className={styles.item}>
          <a
            href="geo:47.6605791,-117.4292277?q=Spokane,WA"
            title="Spokane, WA (47.6605791,-117.4292277)"
            onClick={(e) => {
              // For desktop-like environments, prefer opening Google Maps in a new tab.
              if (!isTouchPrimary) {
                e.preventDefault();
                window.open(
                  "https://www.google.com/maps/search/?api=1&query=47.6605791,-117.4292277",
                  "_blank",
                  "noopener,noreferrer",
                );
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div
              className={styles.contactIcon}
              style={{ backgroundPositionY: "-130px" }}
              aria-hidden="true"
            ></div>
            Spokane, WA{" "}
            <span className={styles.notASuburb}>
              (<i>not</i> near Seattle)
            </span>
          </a>
        </li>
      </ul>
    </div>
  );
};

export default FooterContactList;
