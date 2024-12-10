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
   * Word or whatever else with rich text formatting intact.
   * It needs to use actual spaces (not simulated with margins)
   * to be spaced correctly in migration.
   *
   * To migrate into Illustrator/Word with formatting intact
   * (green bullet, grey text) copy from browser and paste into
   * an RTF document. Then in Illustrator open that RTF, and your
   * formatting will be intact there.
   *
   * And now you don't have to manually replicate
   * these lists every time you update your CV.
   *
   * TODO: Make more consideration for migrating info from here.
   * That may involve changing up PDF designs.
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
    "Vanilla JavaScript",
    "JSX",
    "HTML5",
    "CSS3",
    "SASS / SCSS",
    "JSON",
    "XML",
    "XSL",
    "PHP",
    "Twig",
    "Haxe",
    "ActionScript 3",
    "ActionScript 2",
    "FreeMarker",
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
    "Angular",
    "Angular CLI",
    "React",
    "jQuery",
    "RxJS",
    "Redux",
    "Express",
    "Node",
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
    "Salesforce",
    "Sitecore",
    "OneTrust",
    "Litmus",
    "Vite",
    "ChatGPT",
    "Copilot AI",
    "Perplexity AI",
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
    "DHTML",
    "Accessibility",
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
    "Takeda Pharmaceuticals",
    "Citibank",
    "Golden 1 Credit Union",
    "Avista Utilities",
    "Committee for Children",
    "The Heart Institute of Spokane",
    "AbbVie Pharmaceuticals",
    "Exact Sciences",
    "Comics Kingdom",
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
    const divClassLt = "col-xs-12 col-sm-12 col-md-3 col-lg-3 cv_left";
    const divClassRt = "col-xs-12 col-sm-12 col-md-9 col-lg-9 cv_right";

    return (
      <div>
        <HeaderSub head={"Curriculum Vitae"} subhead={""} />

        <div id="main_content" className="cv-page">
          <div className="container ">
            <h4>Summary</h4>
          </div>

          <div className="container summary">
            <div className="row">
              <div className={divClassLt}></div>

              <div className={divClassRt}>
                <p className="">
                  Rare talent with a rich history in design, animation, and
                  front-end development. Adaptable and results-driven, with a
                  proven ability to transition from award-winning Flash and
                  interactive projects to delivering scalable solutions using
                  frameworks like Angular. Currently deepening expertise in
                  React through recent projects, including a custom portfolio
                  site and a reusable slideshow component designed for
                  scalability and interactivity. Skilled in crafting
                  user-focused experiences for leading companies across
                  industries—ranging from Fortune 500 firms to entertainment
                  giants and innovative startups—blending technical and creative
                  problem-solving to deliver impactful&nbsp;results.
                </p>
              </div>
            </div>
          </div>

          <div className="container">
            <h4>Core Strengths</h4>
          </div>

          <div className="container skills">
            <div className="row">
              <div className={divClassLt}>
                <img
                  src="/images/cv/gear.svg"
                  className="cv-logo"
                  alt="Gear Logo"
                />
              </div>

              <div className={divClassRt}>
                <h5 className="sub-container">
                  <div className="left-sub">
                    Modern Front-End&nbsp;Development
                  </div>
                  <div className="break"></div>
                </h5>

                <ul className="">
                  <li>
                    Angular (3+ years): Advanced component architecture, RxJS,
                    and SCSS integration
                  </li>
                  <li>
                    TypeScript (4+ years): Strong typing (with further history
                    in strongly typed ECMAScript)
                  </li>
                  <li>
                    React (Growing expertise): Reusable components, state
                    management, dynamic routing, and JSX
                  </li>
                </ul>

                <h5 className="sub-container">
                  <div className="left-sub">Creative Problem-Solving</div>
                  <div className="break"></div>
                </h5>

                <ul className="">
                  <li>
                    Animation & UI Design: Transitioned from award-winning
                    Flash/AS3 projects to modern CSS/JS&nbsp;animations
                  </li>
                  <li>
                    Interactive Web Development: Built engaging tools like data
                    explorers and educational SVG&nbsp;UIs
                  </li>
                </ul>

                <h5 className="sub-container">
                  <div className="left-sub">
                    Design &amp; Animation Background
                  </div>
                  <div className="break"></div>
                </h5>

                <ul className="">
                  <li>
                    Strong foundation in design principles with deep experience
                    in Adobe Creative&nbsp;Suite
                  </li>
                  <li>
                    Developed physics-based engines and custom tween solutions
                    for interactive&nbsp;projects
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="container">
            <h4>Professional Experience</h4>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className="container">
            <div className="row">
              <div className={divClassLt}>
                <img
                  src="/images/cv/epsilon.svg"
                  className="cv-logo"
                  alt="Epsilon Logo"
                />
              </div>
              <div className={divClassRt}>
                <div className="cv-listing">
                  <div className="sub-container">
                    <div className="left-sub">
                      <h5>
                        Epsilon
                        <span className="location">
                          &nbsp;&nbsp;-&nbsp;&nbsp;Irving, TX | Remote | W2
                          Employee
                        </span>
                      </h5>
                      Senior Front-end Developer
                    </div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2021 - 2024 ]</div>
                  </div>

                  <p className="desc">
                    Interactive and responsive websites for Fortune 500
                    companies in banking, pharmaceuticals, and entertainment
                  </p>

                  <p className="scope">
                    <span>Technical Scope:</span> Angular 17, TypeScript, RxJS,
                    React 18, Redux, SiteCore, Modular HTML Email, Salesforce,
                    OneTrust,&nbsp;FreeMarker
                  </p>

                  <ul>
                    <li>
                      Developed dynamic and reusable UI components, including
                      forms with robust validation and data-driven informational
                      grids, for the Golden 1 Credit Union website. Leveraged
                      Preact and jQuery to create a seamless user experience
                      with a SiteCore CMS&nbsp;backend
                    </li>
                    <li>
                      Utilized Angular's template-driven and reactive forms,
                      along with SASS, to create responsive forms, data grids,
                      and interactive elements, enhancing user experience and
                      visual consistency on the Citibank website admin&nbsp;area
                    </li>
                    <li>
                      Built and managed reusable email components in Salesforce
                      Marketing Cloud's Content Builder, streamlined email
                      production and ensured brand consistency
                      across&nbsp;campaigns
                    </li>
                    <li>
                      Utilized Litmus to test, troubleshoot, and optimize email
                      campaigns across multiple devices and clients, ensuring
                      consistent rendering, dark mode compatibility, and
                      high&nbsp;deliverability
                    </li>
                    <li>
                      Created interactive tools using jQuery for the Exact
                      Sciences website, including a detailed explorer for the
                      Oncotype DX Breast Recurrence Score Report, enhancing user
                      engagement and data&nbsp;accessibility
                    </li>
                    <li>
                      Developed and optimized consent management workflows using
                      FreeMarker for OneTrust integration, facilitating seamless
                      data exchange between platforms including MuleSoft and
                      Veeva. Specialized in building event-driven and scheduled
                      processes to direct user consent across systems, enhancing
                      data compliance and user&nbsp;experience
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

            <div className="row">
              <div className={divClassLt}>
                <img
                  src="/images/cv/bb.svg"
                  className="cv-logo"
                  alt="BB Interactive Logo"
                />
              </div>
              <div className={divClassRt}>
                <div className="cv-listing">
                  <div className="sub-container">
                    <div className="left-sub">
                      <h5>
                        BB Interactive [Independent Contractor]
                        <span className="location">
                          &nbsp;&nbsp;-&nbsp;&nbsp;Spokane, WA | Remote
                        </span>
                      </h5>
                      Front-end / Interactive Web Developer
                    </div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2020 - 2021 ]</div>
                  </div>

                  <p className="desc">
                    Consulting and site production of specialized projects for
                    diverse clients, including local businesses, a national
                    startup, an international charity, and a major
                    pharmaceutical marketing&nbsp;agency
                  </p>

                  <p className="scope">
                    <span>Technical Scope:</span> Angular 8-11, TypeScript,
                    RxJS, React, SVG, SCSS, Elasticsearch, Craft&nbsp;CMS
                  </p>

                  <ul>
                    <li>
                      Implemented React Move to animate SVG for an informational
                      UI for Committee for Children, a non-profit that helps
                      millions of children in 70 countries every&nbsp;year
                    </li>
                    <li>
                      Built an employment application tracking system with
                      Angular and Elasticsearch as the back end (consumed
                      via&nbsp;GraphQL)
                    </li>
                    <li>
                      Used Craft CMS to build and deploy an admin interface for
                      a Spokane construction company&nbsp;website
                    </li>
                    <li>
                      Animations in JavaScript and CSS3 for the website and
                      banner ads for Novo Nordisk, a multinational
                      pharmaceutical&nbsp;company
                    </li>
                    <li>
                      Prototyping in Angular for a legal investigation
                      application designed to comb through masses of
                      company&nbsp;documents
                    </li>
                    <li>
                      Worked closely with clients, stakeholders, and freelance
                      partners to conceptualize custom UI/UX&nbsp;presentations
                    </li>
                    <li>
                      Lead authoring of site launch plans in collaboration with
                      developers, business analysts, and account&nbsp;managers
                    </li>
                    <li>
                      Consulting, scoping, wire-framing, time-lining, testing,
                      and defect remediation of interactive,
                      responsive&nbsp;websites
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

            <div className="row">
              <div className={divClassLt}>
                <img src="/images/cv/s2.svg" className="cv-logo" alt="Seven2" />
              </div>
              <div className={divClassRt}>
                <div className="cv-listing">
                  <div className="sub-container">
                    <div className="left-sub">
                      <h5>
                        Seven2 Interactive
                        <span className="location">
                          &nbsp;&nbsp;-&nbsp;&nbsp;Spokane, WA
                        </span>
                      </h5>
                      Interactive / Front-end Web Developer
                    </div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2018 - 2019 ]</div>
                  </div>

                  <p className="desc">
                    Interactive and responsive websites for Fortune 500
                    companies in technology and&nbsp;entertainment
                  </p>

                  <p className="scope">
                    <span>Technical Scope:</span> Angular, React, Vue, jQuery,
                    Craft CMS, Grunt, Handlebars,&nbsp;CreateJS
                  </p>

                  <ul>
                    <li>
                      Logic for central 'activities' (site-wide scavenger hunts,
                      wallpaper creators, etc.), interactivity, and media
                      integration in re-sponsive websites for several game
                      launch sites for&nbsp;Nintendo
                    </li>
                    <li>
                      Contributed to development of single-page apps using
                      Typescript and&nbsp;Angular&nbsp;8+
                    </li>
                    <li>
                      Developed a JavaScript timeline animation framework with
                      compact syntax and potential to eliminate the need for
                      CSS3 key frame animations that we found riddled with
                      inconsistencies (still supporting&nbsp;IE)
                    </li>
                    <li>
                      Developed APIs to simplify, stabilize, and streamline
                      integration of DOM and canvas&nbsp;animation
                    </li>
                    <li>
                      Contribution and technical oversight of concepts with
                      teams of designers, developers, and animators,
                      synchronizing on development and QA via&nbsp;Trello
                    </li>
                    <li>
                      Localization strategies for deployment in various
                      international regions (which necessitates special
                      design&nbsp;considerations)
                    </li>
                    <li>
                      Interfacing with Nintendo's Nclood API / platform for
                      managing Nintendo user status and rewards&nbsp;system
                    </li>
                    <li>
                      Built a zero-dependency carousel in vanilla JavaScript for
                      Comics Kingdom, a platform that local newspapers can
                      embed&nbsp;from
                    </li>
                    <li>
                      Strategic considerations for deadlines so tight that
                      development regularly had to start before
                      client&nbsp;approvals
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

            <div className="row">
              <div className={divClassLt}>
                <img
                  src="/images/cv/chalklabs.svg"
                  className="cv-logo"
                  alt="ChalkLabs Logo"
                />
              </div>
              <div className={divClassRt}>
                <div className="cv-listing">
                  <div className="sub-container">
                    <div className="left-sub">
                      <h5>
                        ChalkLabs
                        <span className="location">
                          &nbsp;&nbsp;-&nbsp;&nbsp;Spokane, WA
                        </span>
                      </h5>
                      UI Developer / Designer
                    </div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2017 - 2018 ]</div>
                  </div>

                  <p className="desc">
                    User interface for web applications engineered to aid
                    government organizations in processing, analyzing,
                    visualizing, and understanding&nbsp;data
                  </p>

                  <p className="scope">
                    <span>Technical Scope:</span> Angular, TypeScript,
                    Bootstrap, Mapbox, Elasticsearch, HTML5, REST
                    APIs,&nbsp;Canvas
                  </p>

                  <ul>
                    <li>
                      As a first project, solely developed the dashboard for an
                      iteration of ChalkLabs' flagship SaaS software, Pushgraph.
                      This was the first version as a user-customizable,
                      responsive drag/drop widget&nbsp;framework
                    </li>
                    <li>
                      With sparse instruction and minimal ramp-up, designed the
                      entire UI for the new iteration of Pushgraph in under
                      three&nbsp;days
                    </li>
                    <li>
                      Interfacing with ChalkLabs' backend API using search
                      syntax to query results from databases to populate into
                      custom infinite-scrolling data grid&nbsp;widgets
                    </li>
                    <li>
                      Data visualizations and custom interactions in D3, Mapbox,
                      Highcharts, and other visualization&nbsp;libraries
                    </li>
                    <li>
                      Learned Angular and TypeScript on the clock, and thrown
                      into the fire of heavy development from the start after
                      initial training in Angular, a video series tutorial and a
                      two-week code test to demonstrate quick&nbsp;learning
                    </li>
                    <li>
                      Scoping, timelining, estimating tasks to be tracked and
                      synchronized for sprints via Smartsheet in
                      Kanban&nbsp;workflow
                    </li>
                    <li>
                      Consuming REST APIs to manage users, configuration, and
                      data processed by the Pushgraph application and
                      other&nbsp;projects
                    </li>
                    <li>
                      In June of 2017, worked 350+ hours along with my
                      supervisor to meet an all-or-nothing deadline/contract
                      with EPA worth five million USD, which was existentially
                      everything for the company at the time. One other month
                      there was&nbsp;comparable
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

            <div className="row">
              <div className={divClassLt}>
                <img
                  src="/images/cv/s2.svg"
                  className="cv-logo"
                  alt="Seven2 Logo"
                />{" "}
              </div>
              <div className={divClassRt}>
                <div className="cv-listing">
                  <div className="sub-container">
                    <div className="left-sub">
                      <h5>
                        Seven2 Interactive
                        <span className="location">
                          &nbsp;&nbsp;-&nbsp;&nbsp;Spokane, WA
                        </span>
                      </h5>
                      Lead Flash / Interactive Web Developer
                    </div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2005 - 2016 ]</div>
                  </div>

                  <p className="desc">
                    Development of interactive websites, web banner advertising,
                    and browser games for nationally recognized corporations in
                    the technology and entertainment&nbsp;industries
                  </p>

                  <p className="scope">
                    <span>Technical Scope:</span> ActionScript 3, ActionScript
                    2, JavaScript, jQuery, Require/AMD,&nbsp;Haxe
                  </p>

                  <ul>
                    <li>
                      Lead developer of Seven2's first project for the
                      Nickelodeon Group, a game called Blue's Clues — Mix 'N
                      Match&nbsp;Dressup
                    </li>
                    <li>
                      Saved one project for an AT&T site release that was scoped
                      with an incorrect assumption that JavaScript can
                      screenshot the rendered page for an overlay effect. We
                      faked the effect with video. It got 90 million
                      interactions in one&nbsp;week
                    </li>
                    <li>
                      Key / lead architect of solutions where many developers
                      and animators populated content / games into to flexible
                      templates and frameworks engineered by me for the
                      collaboration of the other&nbsp;developers
                    </li>
                    <li>
                      Lead developer of every one of several first iterations of
                      AT&T's data usage calculators authored
                      in&nbsp;JavaScript/Require
                    </li>
                    <li>
                      Lead developer of AT&T's first ever app store
                      in&nbsp;JavaScript/Require
                    </li>
                    <li>
                      Developed custom music and video players for several MTV
                      websites in&nbsp;ActionScript
                    </li>
                    <li>
                      Created a performant physics-based tween engine before the
                      advent of systems like Tweener and&nbsp;GreenSock
                    </li>
                    <li>
                      Contributed a robust cross-platform mobile accelerometer
                      solution to a popular (then) open-source HTML5 game
                      framework, Flambé, now known as&nbsp;2Dkit
                    </li>
                    <li>
                      Interfacing with backend APIs exchanging JSON, XML, CSV,
                      plain text, and image data for many types of
                      user-initiated server / database transactions, some in
                      zero-dependency JavaScript, and some in&nbsp;ActionScript
                    </li>
                    <li>
                      Contribution on entire process of project
                      conceptualization for projects that consistently won
                      annual&nbsp;awards
                    </li>
                    <li>
                      In addition to innumerable insane deadlines, in June 2014,
                      worked 350+ hours to meet a critical deadline
                      for&nbsp;WildBrain
                    </li>
                    <li>
                      Contributed Flash/ActionScript and JavaScript animation
                      and UI for a project that ended up winning an
                      international/global Webby Award — People's Choice, 2008
                      Art Website of the Year,&nbsp;Artocracy.org.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

            <div className="row">
              <div className={divClassLt}>
                <img
                  src="/images/cv/scw.svg"
                  className="cv-logo"
                  alt="SCW Logo"
                />
              </div>
              <div className={divClassRt}>
                <div className="cv-listing">
                  <div className="sub-container">
                    <div className="left-sub">
                      <h5>
                        SCW Consulting
                        <span className="location">
                          &nbsp;&nbsp;-&nbsp;&nbsp;Spokane, WA
                        </span>
                      </h5>
                      Designer / Front-end Web Developer
                    </div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2005 ]</div>
                  </div>

                  <p className="desc">
                    Design and development of websites and apps for local
                    businesses at the front of C#/
                    <span className="nobr">.NET back-ends</span>
                  </p>

                  <p className="scope">
                    <span>Technical Scope:</span> HTML, CSS, Vanilla JavaScript,
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
                      shopping cart platform that was ahead of its time in an
                      era preceding solutions like&nbsp;Shopify
                    </li>
                    <li>
                      On one project, impressed the agency owner by implementing
                      broad site revisions for under 50% of the budget. I think
                      we then lied to the client about how much budget
                      we&nbsp;used
                    </li>
                    <li>
                      Produced several shortcuts and tricks that were new to
                      others in development, due to the extensive time I had
                      previously spent with&nbsp;DHTML
                    </li>
                    <li>
                      Continually made a lot out of nothing due to
                      unavailability (refusal) of budget for design basics like
                      fonts and stock&nbsp;photography
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

            <div className="row">
              <div className={divClassLt}>
                <img
                  src="/images/cv/bb.svg"
                  className="cv-logo"
                  alt="BB Interactive Logo"
                />
              </div>
              <div className={divClassRt}>
                <div className="cv-listing">
                  <div className="sub-container">
                    <div className="left-sub">
                      <h5>
                        Freelance
                        <span className="location">
                          &nbsp;&nbsp;-&nbsp;&nbsp;Spokane, WA
                        </span>
                      </h5>
                      Designer / Front-end Web Developer
                    </div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2003 - 2005 ]</div>
                  </div>

                  <p className="desc">
                    Design and development of interactive websites for
                    businesses in the Spokane area concurrently while in web
                    design school at SFCC
                  </p>

                  <p className="scope">
                    <span>Technical Scope:</span> XML, XSL, Vanilla JavaScript,
                    Dynamic HTML,&nbsp;PHP
                  </p>

                  <ul>
                    <li>
                      Conceptualizing creative UI and navigation concepts in
                      websites for a variety of businesses in the
                      Spokane&nbsp;area
                    </li>
                    <li>
                      Dynamic, multi-level navigation redesign and development
                      for The Heart Institute of&nbsp;Spokane
                    </li>
                    <li>
                      Utilized XML and XSL in an astonishingly simple and
                      effective CMS-like approach for retailing refurbished
                      fitness&nbsp;equipment
                    </li>
                    <li>
                      Produced websites and other paying freelance projects that
                      met criteria and so received credit for
                      school&nbsp;curriculum
                    </li>
                    <li>
                      In the program I was considerably ahead all the other
                      students, having history in Photoshop, HTML, JavaScript
                      and art, I unofficially tutored other students any time I
                      was in the lab, and was widely regarded as a prodigy by
                      faculty and fellow&nbsp;students.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}
          </div>

          <div className="container">
            <h4>Early Development Journey</h4>
          </div>

          <div className="container">
            <div className="row">
              <div className={divClassLt}>
                <img
                  src="/images/cv/bv.svg"
                  className="cv-logo"
                  alt="Hand Logo"
                />
              </div>
              <div className={divClassRt}>
                <div className="cv-listing">
                  <div className="sub-container">
                    <div className="left-sub">
                      <h5>
                        Hobbyist
                        <span className="location">
                          &nbsp;&nbsp;-&nbsp;&nbsp;Spokane, WA
                        </span>
                      </h5>
                      Interactive Web Enthusiast
                    </div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2001 - 2003 ]</div>
                  </div>

                  <p className="desc">
                    Self-directed learning of graphics software and
                    cross-platform, dynamic, and interactive&nbsp;JavaScript.
                  </p>

                  <p className="scope">
                    <span>Technical Scope:</span> Vanilla JavaScript, HTML, CSS,
                    Dynamic HTML, PHP, and Adobe Create&nbsp;Suite
                  </p>

                  <ul>
                    <li>
                      Pursued self-directed learning in{" "}
                      <b>JavaScript, Dynamic HTML, and web animation</b> while
                      working full-time in a non-technical&nbsp;role.
                    </li>
                    <li>
                      Built early browser-based UI experiments, including
                      functional custom chrome (navigation bars, menus, etc.)
                      and a slot-machine&nbsp;game.
                    </li>
                    <li>
                      Tackled cross-platform compatibility challenges in a
                      fragmented browser era, delivering interactive, animated
                      solutions without&nbsp;Flash.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="container">
            <h4>Formal Education</h4>
          </div>

          <div className="container">
            <div className="row">
              <div className={divClassLt}>
                <img
                  src="/images/cv/ccs.svg"
                  className="cv-logo"
                  alt="SFCC Logo"
                />
              </div>
              <div className={divClassRt}>
                <div className="cv-listing">
                  <div className="sub-container">
                    <div className="left-sub">
                      <h5>
                        Spokane Falls Community&nbsp;College
                        <span className="location">
                          &nbsp;&nbsp;-&nbsp;&nbsp;Spokane, WA
                        </span>
                      </h5>
                      A.A.S. Web Design — Honors
                    </div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2003 - 2005 ]</div>
                  </div>

                  <p className="desc">
                    Recognized with multiple first-place awards; select works
                    published officially for the&nbsp;college.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="container">
            <h4>Technologies and Tools</h4>
          </div>

          <div className="container">
            <div className="row">
              <div className={divClassLt}></div>
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
          </div>

          <div className="container">
            <h4>Achievements</h4>
          </div>

          <div className="container">
            <div className="row">
              <div className={divClassLt}></div>

              <div className={divClassRt}>
                <div className="cv-listing">
                  <h5>14 gold badges on Stack Overflow</h5>
                  <div className="badges">
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                    <img
                      src="/images/cv/gold-badge.svg"
                      className="gold-badge"
                      alt="Gold Badge"
                    />
                  </div>
                  <br />
                  <br />
                  {/* Important br. */}
                  <h5>The Webby Awards</h5>
                  <div className="sub-container">
                    <div className="left-sub">International</div>
                    <div className="break"></div>
                    <div className="right-sub">[ 2008 ]</div>
                  </div>

                  <div>
                    <div className="col-xs-12">
                      People's Choice — Art Website of the Year — Artocracy.org
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

          <div className="container">
            <h4>Clients</h4>
          </div>

          <div className="container">
            <div className="row">
              <div className={divClassLt}></div>

              <div className={divClassRt}>
                <p>{this.clientElems}</p>
              </div>
            </div>

            {/*TempMessage.message()*/}

            {/*///////////////////////////////////////////////////////////////////////////////*/}
          </div>
        </div>
      </div>
    );
  }
}
