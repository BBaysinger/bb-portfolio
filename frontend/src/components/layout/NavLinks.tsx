import React from "react";
import Link from "next/link";
import type { LinkRenderProps } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import MiscUtils from "@/utils/MiscUtils";
import styles from "./Links.module.scss";
import LogoutButton from "@/components/common/LogoutButton";

interface LinksProps {
  onClick?: () => void;
  className?: string;
}

/**
 * Navigation link list populated around the site.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Links: React.FC<LinksProps> = ({ onClick, className }) => {
  const { isLoggedIn } = useAuth();

  return (
    <ul onClick={onClick} className={`${styles.navLinks} ${className}`}>
      {/* {isLoggedIn && ( */}
      <>
        <li>
          <Link
            to="/#top"
            className={({ isActive }: LinkRenderProps) =>
              MiscUtils.isActiveOrAlt(isActive, "/#top", styles.active)
            }
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/portfolio#list"
            className={({ isActive }: LinkRenderProps) =>
              MiscUtils.isActiveOrAlt(
                isActive,
                "/portfolio#list",
                styles.active,
              )
            }
          >
            Portfolio
          </Link>
        </li>
        <li>
          <Link
            to="/cv#top"
            className={({ isActive }: LinkRenderProps) =>
              isActive ? styles.active : ""
            }
          >
            CV
          </Link>
        </li>
      </>
      {/* )} */}
      <li>
        <Link
          to="/contact#top"
          className={({ isActive }: LinkRenderProps) =>
            isActive ? styles.active : ""
          }
        >
          Contact
        </Link>
      </li>
      {isLoggedIn && <LogoutButton className={styles.logout} />}
      {!isLoggedIn && (
        <li className={styles.login}>
          <Link
            to="/login#top"
            className={({ isActive }: LinkRenderProps) =>
              isActive ? styles.active : ""
            }
          >
            Login
          </Link>
        </li>
      )}
    </ul>
  );
};

export default Links;
