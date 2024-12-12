import React, { ReactNode } from "react";

import { PortfolioProjectBase } from "data/portfolioTypes";
import styles from "./ProjectContent.module.scss";

// interface PortfolioProjectData {
//   desc: string[];
//   urls: Map<string, string[] | string>;
//   role: string;
// }

interface ProjectContentProps {
  transition: string;
  projectData: PortfolioProjectBase;
}

/**
 * Display and animate the descriptions, features, and urls/buttons of each portfolio item.
 *
 * TODO: Could this be more pure if we separated these out to two components?...
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class ProjectContent extends React.Component<ProjectContentProps> {
  /**
   *
   *
   * @memberof ProjectContent
   */
  // peiceData = null;

  /**
   * Need a reference to allow parent component access to computed height of div.
   *
   *
   * @memberof ProjectContent
   */
  public domElem: HTMLElement | null = null;

  /**
   *
   *
   * @memberof ProjectContent
   */
  transition = null;

  /**
   *
   *
   * @memberof ProjectContent
   */
  members: Array<HTMLElement | null> = [];

  /**
   *
   *
   * @memberof ProjectContent
   */
  timesUpdated = 0;

  /**
   *
   *
   * @returns
   * @memberof ProjectContent
   */
  shouldComponentUpdate() {
    // HERE: https://medium.com/@User3141592/react-gotchas-and-best-practices-2d47fd67dd22
    this.timesUpdated++;

    if (this.timesUpdated > 0) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * TODO: Figure out why this member doesn't exist on refs at runtime.
   *
   * @readonly
   * @memberof ProjectContent
   */
  get height() {
    return this.domElem?.offsetHeight;
  }

  /**
   *
   *
   * @memberof ProjectContent
   */
  addMember = (member: HTMLElement | null) => {
    if (member && this.members) {
      this.members.push(member);
      member.style.transitionDelay =
        this.members.length * 0.0 + "s, " + this.members.length * 0.01 + "s";
      member.style.transitionDuration =
        this.members.length * 0.2 + "s, " + this.members.length * 0.2 + "s";
    } else {
      // TODO: Is this a problem?
      // console.log("eh?");
    }
  };

  /**
   *
   *
   * @memberof ProjectContent
   */
  componentWillUnmount() {
    setTimeout(() => {
      // Garbage collect.
      this.members = [];
    }, 0);
  }

  /**
   *
   *
   * @returns
   * @memberof ProjectContent
   */
  render() {
    const projectData: PortfolioProjectBase = this.props.projectData;
    const { desc, urls, role } = projectData;

    const descs = desc.map((htmlContent, index) => (
      <div
        key={index}
        ref={this.addMember}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    ));

    const urlBtns: ReactNode = Object.entries(urls).map(([label, urls]) => {
      if (Array.isArray(urls)) {
        return (
          <span className="btn-group" ref={this.addMember} key={label}>
            <span className="btn btn-group-label">{label}</span>
            {urls.map((item, index) => (
              <a key={item} href={item} className={styles.btn} target="_blank">
                {index + 1}
              </a>
            ))}
          </span>
        );
      } else if (typeof urls === "string") {
        return (
          <a
            className="btn"
            href={urls}
            ref={this.addMember}
            key={urls}
            target="_blank"
          >
            {label}
          </a>
        );
      } else {
        throw new Error("Type must be string[] or string.");
      }
    });

    return (
      <div
        id={styles.projectInfoAndFeatures}
        className="info container"
        ref={(domElem) => {
          this.addMember(domElem);
          this.domElem = domElem;
        }}
      >
        <div className={styles["desc-paragraphs"]}>
          {descs}
          {role && (
            <div ref={this.addMember}>
              <p>
                <span style={{ fontWeight: "bold" }}>Role:</span> {role}
              </p>
            </div>
          )}
        </div>
        <div className={styles["url-btns"]}>{urlBtns}</div>
      </div>
    );
  }
}
