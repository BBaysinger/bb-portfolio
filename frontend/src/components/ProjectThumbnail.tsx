import React, { createRef } from "react";
import { Link } from "react-router-dom";
import HoverCapabilityWatcher from "utils/HoverCapabilityWatcher";

interface ProjectThumbnailProps {
  focused: boolean;
  key: string; //facebook.github.io/react/docs/multiple-components.html#dynamic-children
  index: number;
  omitFromList: boolean;
  projectId: string;
  title: string;
  clientId: string;
}

/**
 * The thumbnails in the portfolio/home that each link out to a specific portfolio project.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class ProjectThumbnail extends React.Component<ProjectThumbnailProps> {
  private divRef = createRef<HTMLDivElement>();

  getDOMNode() {
    return this.divRef.current; // Access the DOM element
  }

  /**
   *
   *
   * @returns
   * @memberof ProjectThumbnail
   */
  render() {
    const { projectId, title, clientId } = this.props;

    const style = {
      backgroundImage: "url('/images/thumbs/" + projectId + ".jpg')",
    };

    const focus = this.props.focused ? "project-thumbnail-focus" : "";
    const hoverEnabled = HoverCapabilityWatcher.instance.isHoverCapable
      ? "hover_enabled"
      : "";

    return (
      <div
        className={"project-thumbnail " + focus + " " + hoverEnabled}
        style={style}
        ref={this.divRef}
      >
        <Link to={`/portfolio/${projectId}#project`}>
          <div className="vingette"></div>
          <div className="thumb-content">
            <img
              src={"/images/client-logos/" + clientId + ".svg"}
              className="client-logo"
              alt={clientId + " logo"}
            />
            <h4 className="thumb-title">{title}</h4>
          </div>
        </Link>
      </div>
    );
  }
}
