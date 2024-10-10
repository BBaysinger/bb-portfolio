import React from "react";

import HeaderSub from "../components/layout/HeaderSub";

import "@/styles/whoami.scss";

/**
 * My about page, titled as a question for some pseudo-mystery. Who's The Riddler now?
 *
 * Mostly a static page.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class WhoAmI extends React.Component {
  /**
   *
   *
   * @returns
   * @memberof WhoAmI
   */
  render() {
    return (
      <div>
        <HeaderSub head={"Who Am I?"} subhead={""} />

        <div id="main_content" className="container textual_page whoami_page">
          {/* <p>
            className="emphasis"
            style={{ fontSize: "16px", lineHeight: "22px" }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>*/}

          <h4>A Creator and Recreator</h4>

          <section>
            <h5>Introduction</h5>

            {/* <div className="sub-container">
            <div className="left-sub">XXX</div>
            <div className="right-sub">xxx</div>
            </div> */}

            <p>
              I'm a nearly lifelong resident of the beautiful city of Spokane on
              the eastern side of Washington State near the Idaho Panhandle. I'm
              highly recreative in the many outdoorsy hotspots in an area with
              76 lakes nearby. One such hotspot is Spokane Riverfront Park,
              which National Geographic has listed as one of the top ten urban
              parks in the&nbsp;nation.
            </p>

            <p>
              In addition to my love for bringing beautiful web projects to
              life, I have a history in fine arts and industrial&nbsp;arts.
            </p>

            <p>
              To put it simply, I love to create. The personal reward I get from
              making beautiful things makes work seem not like work. It doesn't
              matter if it's a sculpture, a painting on canvas, or a technical
              progressive web application. I also love to challenge myself and,
              as many people have witnessed, I go big on&nbsp;challenges.
            </p>
          </section>

          <section>
            <h5>Workhorse</h5>

            <p>
              The advertising industry where I've spent many years is known for
              turn-and-burn projects, and that couldn't be more true in digital
              advertising. Agencies treat developers and designers well, but
              when deadlines loom, in every way we are expected to sacrifice
              from our personal lives for our projects, clients, and colleagues.
              (Also happens to be true of my particular experience in
              data&nbsp;science.)
            </p>
          </section>
          <section>
            <h5>Leisure</h5>

            <p>
              Over the last few years, I've been increasingly pursuing a healthy
              and active lifestyle. This has led me to becoming a bit of an
              adventurer. But I have long preferred to bike to work every day of
              the year, even through hard winters, and am emphatic about all
              things cycling. It is a lifestyle for me and leaves me with many
              tales to tell. I won't do that here, but I will say, as I often do
              with technical challenges, I take on things that are daunting, and
              I make them&nbsp;happen.
            </p>
          </section>
          <section>
            <h5>It's a wrap!</h5>

            <p
              className="emphasis"
              style={{ fontSize: "16px", lineHeight: "22px" }}
            >
              Personal challenges are part of my character. And I take a great
              deal of pride in my work. If all goes well, you'll see these
              things in me. Let's make awesome projects&nbsp;together!
            </p>
          </section>
        </div>
      </div>
    );
  }
}
