import React from "react";

import HeaderSub from "components/HeaderSub";

import "./CurriculumVitae.scss";

/**
 * CV Page. Mostly static HTML, with some helper functions for formatting.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class CurriculumVitae extends React.Component {
  /**
   * Function also serves to help migrate inline lists into
   * Illustrator or whatever else with rich text formatting intact.
   * It needs to use actual spaces (not simulated with margins)
   * to be spaced correctly in migration.
   *
   * To migrate into Illustrator with formatting intact
   * (green bullet, grey text) copy from browser and paste into
   * an RTF document. Then in Illustrator open that RTF, and your
   * formatting will be intact there.
   *
   * And now you don't have to manually replicate
   * these lists every time you update your CV.
   *
   * TODO: Make more consideration for migrating info from here
   * into PDF versions. That may involve changing up PDF designs.
   *
   * TODO: Consider a programmatic export option from this page.
   *
   * @param {Array<string>} phrases
   * @returns
   * @memberof CurriculumVitae
   */
  wrapPhrases(phrases: Array<string>) {
    let wrappedPhrases = phrases.map((data: string, i: number) => {
      return (
        <span className="inline-list-item" key={i}>
          <span className="phrase">{data}</span>
          <span key={i} className="bullet">
            &nbsp;&nbsp;•&nbsp;
            {/* Allow wrap. */}
            <span>&#32;</span>
          </span>
        </span>
      );
    });

    return wrappedPhrases;
  }

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  lang = [
    "TypeScript",
    "ES6",
    "ES5",
    "vanilla JavaScript",
    "JSX",
    "HTML / HTML5",
    "CSS / CSS3",
    "SASS / SCSS",
    "JSON",
    "XML",
    "XSL",
    "PHP",
    "Twig",
    "Haxe",
    "AS3",
    "AS2",
  ];

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  langElems = this.wrapPhrases(this.lang);

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  tech = [
    "Angular 2/4/6/8/10",
    "React",
    "jQuery",
    "RxJS",
    "Babel",
    "Craft CMS",
    "NPM",
    "Webpack",
    "Grunt",
    "Gulp",
    "Mustache / Handlebars",
    "Docker",
    "Bootstrap",
    "SVG",
    "Canvas",
    "Flexbox",
    "Grid",
    "Require / AMD",
    "Git",
    "SVN",
    "Elasticsearch",
    "Create / Easel",
    "Mapbox",
    "GreenSock / GSAP",
    "Flambé / 2DKit",
    "Create / EaselJS",
  ];

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  techElems = this.wrapPhrases(this.tech);

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  concepts = [
    "SPAs",
    "OOP",
    "MVC",
    "MVVM",
    "DHTML",
    "accessibility",
    "SEO",
    "REST APIs",
    "Design Patterns",
    "Game Engines",
    "Tween Engines",
    "Quality Assurance",
    "Tracking / Analytics",
  ];

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  conceptsElems = this.wrapPhrases(this.concepts);

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  software = [
    "Illustrator",
    "Photoshop",
    "Animate (w/ scripting & HTML5 export)",
    "Visual Studio",
    "VSCode",
    "Atom Editor",
    "Sublime Text",
    "Dreamweaver",
    "VirtualBox",
    "Sauce Labs",
    "BrowserStack",
    "Git Tower",
    "Sourcetree",
    "MAMP",
    "Jira",
    "Trello",
    "Smartsheet",
    "Google Docs",
    "Confluence",
    "OS X",
    "Windows",
    "Terminal / Command Prompt",
  ];

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  softwareElems = this.wrapPhrases(this.software);

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  other = ["Quality Assurance", "Tracking / Analytics"];

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  otherElems = this.wrapPhrases(this.other);

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  clients = [
    "Nickelodeon",
    "Nick Jr.",
    "Nintendo",
    "Disney",
    "Mattel",
    "AT&T",
    "MTV",
    "Netflix",
    "National Geographic",
    "USDA",
    "EPA",
    "NIFA",
    "Expedia",
    "New Line Cinema",
    "The Weinstein Company",
    "Addicting Games",
    "The N",
    "T-Mobile",
    "Premera Blue Cross",
    "Bravo",
    "Earthbound Farms",
    "Cingular",
    "HTC",
    "OnSet Productions",
    "Ronix Wakeboards",
    "RedHook Brewery",
    "Stoli Vodka",
    "Tanteo Tequila",
    "Tobacco Smokes You",
    "UBS Financial Services",
    "XM Radio",
    "Lincoln Mercury",
    "Dannon",
    "Yoplait",
    "Post",
    "WildBrain",
    "Yesmail",
    "Novo Nordisk",
    "and many more...",
  ];

  /**
   *
   *
   * @memberof CurriculumVitae
   */
  clientElems = this.wrapPhrases(this.clients);

  /**
   *
   *
   * @returns
   * @memberof CurriculumVitae
   */
  render() {
    const divClassLt = "col-xs-12 col-sm-12 col-md-3 col-lg-3";
    const divClassRt = "col-xs-12 col-sm-12 col-md-9 col-lg-9 cv_right";

    return (
      <div>
        <HeaderSub head={"Curriculum Vitae"} subhead={""} />

        <div id="main_content" className="container cv-page">
          <div className="section">
            <div className={divClassLt}>
              <h4>Experience</h4>
            </div>
            <div className={divClassRt}>
              <div className="cv-listing">
                <h5>Independent Contractor</h5>

                <div className="sub-container">
                  <div className="left-sub">Interactive Web Developer</div>
                  <div className="break"></div>
                  <div className="right-sub">[ 2019 - Present ]</div>
                </div>

                <p className="desc">
                  Provided technical leadership in consulting and website
                  production of specialized and focused projects for diverse
                  clients, including local businesses, nationally-targeted
                  startups, an international charity, and a pharmaceutical
                  marketing&nbsp;agency
                </p>

                <p className="scope">
                  <span>Technical Scope:</span> Angular 2+, TypeScript, React,
                  SVG, SCSS, Elasticsearch, Craft&nbsp;CMS
                </p>

                <ul>
                  <li>
                    Consulting, scoping, wire-framing, time-lining, and
                    development of interactive, responsive&nbsp;websites
                  </li>
                  <li>
                    Working closely with clients, stakeholders, and freelance
                    partners to conceptualize custom UI/UX&nbsp;presentations
                  </li>
                  <li>
                    Analyzed business requirements, participated in technical
                    design, development and testing
                    cross-platform&nbsp;strategies
                  </li>
                  <li>
                    Built and integrated an Angular employment application
                    tracking system with Elasticsearch
                    (consumed&nbsp;via&nbsp;REST)
                  </li>
                  <li>
                    Collaborated and organized with different teams remotely via
                    Jira, Smartsheet, Google Docs, and video&nbsp;conferencing
                  </li>
                  <li>
                    Designed and coded application components in Agile
                    environments and development&nbsp;approaches
                  </li>
                </ul>
              </div>

              {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- ----*/}

              <div className="cv-listing">
                <h5>Seven2 Interactive</h5>

                <div className="sub-container">
                  <div className="left-sub">Interactive Web Developer</div>
                  <div className="break"></div>
                  <div className="right-sub">[ 2018 - 2019 ]</div>
                </div>

                <p className="desc">
                  Interactive and responsive websites for Fortune 500 companies
                  in technology and&nbsp;entertainment
                </p>

                <p className="scope">
                  <span>Technical Scope:</span> Angular 2+, React, Vue, jQuery,
                  Craft CMS, Grunt, Handlebars,&nbsp;CreateJS
                </p>

                <ul>
                  <li>
                    Logic for central 'activities' (site-wide scavenger hunts,
                    wallpaper creators, etc), interactivity, and media in
                    responsive websites for&nbsp;Nintendo
                  </li>
                  <li>
                    Developed APIs to simplify, stabilize, and streamline
                    integration of DOM and canvas&nbsp;animation
                  </li>
                  <li>
                    Developed a JavaScript timeline animation framework with
                    compact syntax and potential to eliminate the need for CSS3
                    key frame animations that we found riddled with
                    inconsistencies. (This will likely become an open source
                    library at some&nbsp;point)
                  </li>
                  <li>
                    Contribution and technical oversight of concepts with teams
                    of designers, developers, and animators, synchronizing on
                    development and QA via Trello (similar to&nbsp;Jira)
                  </li>
                  <li>
                    Language localization strategies for deployment in various
                    international regions (which necessitates special
                    design&nbsp;considerations)
                  </li>
                  <li>
                    Interfacing with Nintendo's Nclood API / platform for
                    managing Nintendo user status and rewards&nbsp;system
                  </li>
                  <li>
                    Strategic considerations for deadlines so tight that
                    development had to start <i>before</i> client&nbsp;approvals
                  </li>
                </ul>
              </div>

              {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- ----*/}

              <div className="cv-listing">
                <h5>ChalkLabs</h5>

                <div className="sub-container">
                  <div className="left-sub">UI Developer</div>
                  <div className="break"></div>
                  <div className="right-sub">[ 2017 - 2018 ]</div>
                </div>

                <p className="desc">
                  User interface for web applications engineered to aid
                  government organizations in processing, analyzing,
                  visualizing, and understanding&nbsp;data
                </p>

                <p className="scope">
                  <span>Technical Scope:</span> (Heavy) Angular 2+, TypeScript,
                  Bootstrap, Mapbox, Elasticsearch, HTML5, REST
                  APIs,&nbsp;Canvas
                </p>

                <ul>
                  <li>
                    As a first project, solely developed the dashboard for an
                    iteration of ChalkLabs’ flagship SaaS software, Pushgraph.
                    This was the first version as a user-customizable,
                    responsive drag/drop widget framework (largely developed
                    before&nbsp;designed)
                  </li>
                  <li>
                    With sparse instruction and negligible time for ramp-up,
                    designed the entire UI for the new iteration of Pushgraph in
                    under three&nbsp;days
                  </li>
                  <li>
                    Interfacing with ChalkLabs' backend API using search syntax
                    to query results from databases to populate into custom
                    infinite-scrolling data grid widgets that I&nbsp;developed
                  </li>
                  <li>
                    Data visualizations and custom interactions in D3, Mapbox,
                    Highcharts, and other visualization&nbsp;libraries
                  </li>
                  <li>
                    Learned Angular and TypeScript on the clock, and thrown into
                    the fire of heavy development from the start after my
                    initial 'training' in Angular, a video series tutorial and a
                    two-week code test to demonstrate quick&nbsp;learning
                  </li>
                  <li>
                    Scoping, timelining, estimating tasks to be tracked and
                    synchronized for sprints via Smartsheet in
                    Kanban&nbsp;workflow
                  </li>
                  <li>
                    Consuming REST APIs to manage users, configuration, and data
                    processed by the Pushgraph&nbsp;application
                  </li>
                  <li>
                    In June of 2017, worked 350+ hours along with my supervisor
                    to meet an all-or-nothing deadline/contract with EPA worth
                    five million USD, which was existentially everything for the
                    company at the&nbsp;time
                  </li>
                  <li>
                    Otherwise dominated on a regular stream of
                    blistering&nbsp;deadlines
                  </li>
                </ul>
              </div>

              {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- ----*/}

              <div className="cv-listing">
                <h5>Seven2 Interactive</h5>

                <div className="sub-container">
                  <div className="left-sub">Interactive Web Developer</div>
                  <div className="break"></div>
                  <div className="right-sub">[ 2005 - 2016 ]</div>
                </div>

                <p className="desc">
                  Development of interactive websites, web banner advertising,
                  and browser games for nationally recognized corporations in
                  the technology and entertainment&nbsp;industries
                </p>

                <p className="scope">
                  <span>Technical Scope:</span> (Heavy) ActionScript 3,
                  JavaScript, jQuery, Require,&nbsp;Haxe
                </p>

                <ul>
                  <li>
                    Continuously relied upon as a key / lead architect of
                    solutions where many developers and animators populated
                    content / games into to flexible templates and frameworks
                    I&nbsp;engineered
                  </li>
                  <li>
                    Utilized various existing game mechanics and ones authored
                    by me, per&nbsp;project
                  </li>
                  <li>
                    Lead developer of Seven2's first game / project for
                    Nickelodeon Group, Blue's Clues —
                    Mix&nbsp;'N&nbsp;Match&nbsp;Dressup
                  </li>
                  <li>
                    Lead developer of every one of several first iterations of
                    data usage calculators for AT&amp;T
                  </li>
                  <li>
                    Developed custom audio and video players for several
                    MTV&nbsp;websites
                  </li>
                  <li>
                    Created a performant physics-based tween engine before the
                    advent of systems like Tweener and&nbsp;GreenSock
                  </li>
                  <li>
                    Contributed a robust cross-platform mobile accelerometer
                    solution to a popular (then) open-source HTML5 game
                    framework now known as&nbsp;2Dkit
                  </li>
                  <li>
                    Interfacing with backend APIs exchanging JSON, XML, CSV,
                    plain text, and image data for many types of user-initiated
                    server / database&nbsp;interactions
                  </li>
                  <li>
                    Contribution on entire process of project conceptualization
                    for projects that consistently won annual&nbsp;awards
                  </li>
                  <li>
                    In addition to hundreds of insane deadlines, in June 2014,
                    worked 350+ hours to meet a critical deadline
                    for&nbsp;WildBrain
                  </li>
                </ul>
              </div>

              {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- ----*/}

              <div className="cv-listing">
                <h5>SCW Consulting</h5>

                <div className="sub-container">
                  <div className="left-sub">Designer / UI Developer</div>
                  <div className="break"></div>
                  <div className="right-sub">[ 2005 ]</div>
                </div>

                <p className="desc">
                  Design and development of websites and apps for local
                  businesses at the front of C#/.NET{" "}
                  <span className="nobr">back-ends</span>
                </p>

                <p className="scope">
                  <span>Technical Scope:</span> HTML, CSS, vanilla JavaScript,
                  Visual Studio, AJAX,&nbsp;DHTML
                </p>

                <ul>
                  <li>
                    As the sole designer, produced overall look, feel, and
                    branding on sites for businesses new to an
                    online&nbsp;presence
                  </li>
                  <li>
                    Design and UI development of SCW's reusable e-commerce /
                    shopping cart platform that was ahead of its time in an era
                    preceeding solutions like&nbsp;shopify
                  </li>
                  <li>
                    On one particular project, shocked the agency owner by
                    implementing broad site revisions for under 25% of the
                    budget. We had to lie to the client about how much budget
                    we&nbsp;used
                  </li>
                  <li>
                    Produced a number of shortcuts and tricks that were new to
                    others in development, due to the extensive time I had
                    previously spent with&nbsp;DHTML
                  </li>
                </ul>
              </div>

              {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- ----*/}

              <div className="cv-listing">
                <h5>Freelance</h5>

                <div className="sub-container">
                  <div className="left-sub">Designer / UI Developer</div>
                  <div className="break"></div>
                  <div className="right-sub">[ 2003 - 2005 ]</div>
                </div>

                <p className="desc">
                  Design and development of interactive websites for businesses
                  in the Spokane&nbsp;area
                </p>

                <p className="scope">
                  <span>Technical Scope:</span> XML, XSL, vanilla JavaScript,
                  Dynamic HTML,&nbsp;PHP
                </p>

                <ul>
                  <li>
                    Conceptualizing creative UI and navigation concepts in
                    websites for a variety of business in the Spokane&nbsp;area
                  </li>
                  <li>
                    Dynamic, multi-level navigation redesign and development for
                    The Heart Institute&nbsp;of&nbsp;Spokane
                  </li>
                  <li>
                    Utilized XML and XSL in a simple CMS-like approach for
                    refurbished fitness&nbsp;equipment
                  </li>
                  <li>
                    Produced websites and other projects that met criteria and
                    received credit for school&nbsp;curriculum
                  </li>
                </ul>
              </div>

              {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- ----*/}

              <div className="cv-listing">
                <h5>Hobbyist</h5>

                <div className="sub-container">
                  <div className="left-sub">Interactive Tinkerer</div>
                  <div className="break"></div>
                  <div className="right-sub">[ 2001 - 2003 ]</div>
                </div>

                <p className="desc">
                  Self-directed learning of graphics software and cross platform
                  dynamic and interactive UI coding&nbsp;practices
                </p>

                <p className="scope">
                  <span>Technical Scope:</span> vanilla JavaScript, HTML, CSS,
                  Dynamic HTML,&nbsp;PHP
                </p>

                <ul>
                  <li>
                    Operating solely on inspiration to experiment, delved deeply
                    into creative UI concepts beyond my skill and nurtured
                    technical understanding to accomplish&nbsp;them
                  </li>
                  <li>
                    Took an immediate fascination with the possibilities of
                    animation in web&nbsp;media
                  </li>
                  <li>
                    In a notoriously fragmented era for browsers, took on
                    cross-platform and backward-compatible challenges, partly to
                    stand out from other developers, but mostly as an
                    interesting and rewarding&nbsp;challenge
                  </li>
                  <li>
                    This lead to creating effects that looked like Flash with
                    only early DOM elements, which was extremely unusual due to
                    notorious incompatibility issues of the&nbsp;era
                  </li>
                  <li>
                    As an experiment, into a blank browser window, populated a
                    set of fully-functional custom browser chrome (UI),
                    including drop-down menus, history, location bar, navigation
                    buttons, and proportional scrollbars — all built with
                    theme/color&nbsp;options
                  </li>
                  <li>
                    Built my first game withing weeks of learning JavaScript, a
                    whimsical DHTML slot&nbsp;machine
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="section">
            <div className={divClassLt}>
              <h4>Education</h4>
            </div>

            <div className={divClassRt}>
              <h5 className="sub-container">
                <div className="left-sub">
                  Spokane Falls Community&nbsp;College
                </div>
                <div className="break"></div>
                <div className="right-sub">[ 2005 ]</div>
              </h5>

              <p>A.A.S. Web Design — Honors — Awards</p>
            </div>
          </div>

          <div className="section">
            <div className={divClassLt}>
              <h4>Skills</h4>
            </div>
            <div className={divClassRt}>
              <div className="cv-listing">
                <h5>Languages</h5>
                <p>{this.langElems}</p>
              </div>
              <div className="cv-listing">
                <h5>Technologies</h5>
                <p>{this.techElems}</p>
              </div>
              <div className="cv-listing">
                <h5>Concepts</h5>
                <p>{this.conceptsElems}</p>
              </div>
              <div className="cv-listing">
                <h5>Software</h5>
                <p>{this.softwareElems}</p>
              </div>
              {/* <div className="cv-listing">
                <h5>Other</h5>
                <p>{this.otherElems}</p>
              </div> */}
            </div>
          </div>

          <div className="section">
            <div className={divClassLt}>
              <h4>Awards</h4>
            </div>

            <div className={divClassRt}>
              <div className="cv-listing">
                <h5>The Webby Awards</h5>
                <div className="sub-container">
                  <div className="left-sub">International</div>
                  <div className="break"></div>
                  <div className="right-sub">[ 2008 ]</div>
                </div>

                <div className="row">
                  <div className="col-xs-12">
                    People's Choice — Art Website of the&nbsp;Year&nbsp; —
                    Artocracy.org
                  </div>
                </div>
              </div>

              <div className="cv-listing">
                <h5>American Advertising Federation</h5>
                <div className="sub-container">
                  <div className="left-sub">Spokane</div>
                  <div className="break"></div>
                  <div className="right-sub">[ 2009 - 2019 ]</div>
                </div>
                <div className="row">
                  <div className="col-md-12">
                    Contributed to over thirteen projects that received awards
                    in the annual Spokane Ad Fed (Addy) Awards, including five
                    Silver, four Gold, two Best of Division, one Best of Show,
                    and one Golden&nbsp;Pixel
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="section">
            <div className={divClassLt}>
              <h4>Clients</h4>
            </div>

            <div className={divClassRt}>
              <p>{this.clientElems}</p>
            </div>
          </div>

          {/*TempMessage.message()*/}

          {/*///////////////////////////////////////////////////////////////////////////////*/}
        </div>
      </div>
    );
  }
}
