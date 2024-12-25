import React from "react";

interface HeaderSubProps {
  head: string;
  subhead?: string;
}

import styles from "./Header.module.scss";

/**
 * This is the header for every page other than the home page. It takes a parameter
 * for the page title it displays.
 *
 * TODO: Handle height changes in a better way. Currently, on mobile, a min-height could be
 * considered, but could also be smoothed out with CSS3 transitions to handle titles going to
 * multiple lines, so as to prevent content
 * from snapping around from page to page, consistent with the handling on info/features height.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class HeaderSub extends React.Component<HeaderSubProps> {
  /**
   *
   *
   * @returns
   * @memberof HeaderSub
   */
  render() {
    const { head, subhead } = this.props;

    const subheadElem = subhead ? (
      <h5 className={styles["subhead"]}>{subhead}</h5>
    ) : null;

    return (
      <header className={`${styles["header-sub"]} ${styles["header"]}`}>
        <div className={styles["overhead-fill"]}></div>
        <h1>{head}</h1>
        {subheadElem}
      </header>
    );
  }
}
