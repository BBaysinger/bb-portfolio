import React from "react";

import HeaderSub from "components/layout/HeaderSub";
import styles from "./CurriculumVitae.module.scss";

/**
 * CV Page. Mostly static HTML, with some helper functions for formatting.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const CurriculumVitae: React.FC = () => {
  /**
   * Wraps phrases into styled span elements for display.
   *
   * @param {Array<string>} phrases - List of phrases to format.
   * @returns {React.ReactNode[]} Wrapped JSX elements.
   */
  const wrapPhrases = (phrases: string[]): React.ReactNode[] => {
    return phrases.map((data, i) => (
      <span className={styles["inline-list-item"]} key={i}>
        <span className={styles["phrase"]}>{data}</span>
        <span className={styles["bullet"]}>
          &nbsp;&bull;
          {/* Allow wrap. */}
          <span>&#32;</span>
        </span>
      </span>
    ));
  };

  const lang = [
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

  const tech = [
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

  const concepts = [
    "SPAs",
    "OOP",
    "MVC",
    "DHTML",
    "Accessibility",
    "SEO",
    "REST APIs",
    "Design Patterns",
    "Game Frameworks",
    "Tween Engines",
    "Quality Assurance",
    "Tracking / Analytics",
  ];

  const software = [
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

  const clients = [
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

  const divClassLt = `col-xs-12 col-sm-12 col-md-3 col-lg-3 ${styles["cv-left"]}`;
  const divClassRt = `col-xs-12 col-sm-12 col-md-9 col-lg-9 ${styles["cv-right"]}`;
  const rowClass = `row ${styles["row"]}`;

  return (
    <div>
      <HeaderSub head={"Curriculum Vitae"} />

      <div id="mainContent" className={`cv-page ${styles["cv-page"]}`}>
        <div className={`container ${styles["subhead"]}`}>
          <h4>Summary</h4>
        </div>

        <div className={`container ${styles["summary"]}`}>
          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/dart.svg"
                className={styles["cv-logo"]}
                alt="Dart Logo"
              />
            </div>

            <div className={divClassRt}>
              <p>
                Uncommon talent with a rich history in design, interactive
                animation, and interactive development. Adaptable and
                results-driven, with a proven ability to transition from
                award-winning Flash and interactive projects to delivering
                scalable solutions using frameworks like Angular. Currently
                deepening expertise in React through recent projects, including
                some reusable interactive components. Skilled in crafting
                user-focused experiences for leading companies across
                industries—ranging from Fortune 500 firms to entertainment
                giants and innovative startups—blending technical and creative
                problem-solving to deliver impactful and polished results.
              </p>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4>Core Strengths</h4>
        </div>

        <div className={`container ${styles["skills"]}`}>
          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/wrench.svg"
                className={styles["cv-logo"]}
                alt="Wrench Logo"
              />
            </div>

            <div className={divClassRt}>
              <h5 className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  Modern Front-End Development
                </div>
                <div className={styles["break"]}></div>
              </h5>

              <ul>
                <li>
                  Angular (2+ years): Advanced component architecture, RxJS, and
                  SCSS integration
                </li>
                <li>
                  TypeScript (3+ years): Strong typing (with further history in
                  strict-typed ECMAScript)
                </li>
                <li>
                  React (Growing expertise): Reusable components, state
                  management, Redux, hooks, dynamic routing, and JSX
                </li>
              </ul>

              <h5 className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  Creative Problem-Solving
                </div>
                <div className={styles["break"]}></div>
              </h5>

              <ul>
                <li>
                  Animation & UI Design: Transitioned from award-winning
                  Flash/AS3 projects to modern CSS/JS animations
                </li>
                <li>
                  Interactive Web Development: Built engaging tools like data
                  explorers and educational SVG UIs
                </li>
              </ul>

              <h5 className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  Design &amp; Animation Background
                </div>
                <div className={styles["break"]}></div>
              </h5>

              <ul>
                <li>
                  Strong foundation in design principles with deep experience in
                  Adobe Creative Suite
                </li>
                <li>
                  Developed physics-based engines and custom tween solutions for
                  interactive projects
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4>Professional Experience</h4>
        </div>

        {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

        <div className={"container"}>
          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/epsilon.svg"
                className={styles["cv-logo"]}
                alt="Epsilon Logo"
              />
            </div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>
                    Epsilon
                    <span className={styles["location"]}>
                      {" "}
                      — Irving, TX | Remote | W2
                    </span>
                  </h5>
                  Senior Front-end Developer
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2021 - 2024 ]</div>
              </div>

              <p className={styles["desc"]}>
                Interactive and responsive websites for Fortune 500 companies in
                banking, pharmaceuticals, and entertainment
              </p>

              <p className={styles["scope"]}>
                <span>Technical Scope:</span> Angular, TypeScript, jQuery, Adobe
                Suite, Sitecore, HTML Email, Salesforce, OneTrust, FreeMarker
              </p>

              <ul>
                <li>
                  Implemented dynamic UI components, such as forms with
                  validation, data-driven informational grids, global
                  navigation, and collapsible menus for the Golden 1 Credit
                  Union website, leveraging jQuery and <b>Sitecore</b> CMS
                  integration.
                </li>
                <li>
                  Delivered responsive forms, data grids, and interactive
                  elements for the Citibank website and admin area using{" "}
                  <b>Angular</b> reactive forms and SASS, enhancing UX and
                  visual consistency. Developed loan rate calculators and modals
                  using Angular projection.
                </li>
                <li>
                  Built and maintained reusable, modular email components in{" "}
                  <b>Salesforce</b> Marketing Cloud. Streamlined and
                  standardized email production using preprocessing, ensuring
                  brand consistency across campaigns.
                </li>
                <li>
                  Optimized email campaigns with <b>Litmus</b> testing for
                  multi-device compatibility, including dark mode and
                  double-density graphics, achieving high deliverability and
                  consistent rendering.
                </li>
                <li>
                  Created the Oncotype DX Breast Recurrence Score Report
                  Explorer for the Exact Sciences website, helping users
                  understand diagnostic results documents. Contributed to
                  responsive/interactive components, and defect resolution.
                </li>
                <li>
                  Developed consent management workflows using <b>FreeMarker</b>{" "}
                  for <b>OneTrust</b> integration, facilitating seamless data
                  exchange across platforms like MuleSoft and Veeva, enhancing
                  compliance and user experience through event-driven and
                  scheduled processes.
                </li>
                <li>
                  Implemented OneTrust preference centers to manage user
                  consent, data privacy preferences, and regulatory compliance
                  (GDPR, CCPA) across multiple platforms.
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/bb.svg"
                className={styles["cv-logo"]}
                alt="BB Interactive Logo"
              />
            </div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>
                    BB Interactive
                    <span className={styles["location"]}>
                      {" "}
                      — Spokane, WA | Remote
                    </span>
                  </h5>
                  Front-end / Interactive Web Developer
                  <div className={styles["parenthetical"]}>
                    [Independent Contractor]
                  </div>
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2020 - 2021 ]</div>
              </div>

              <p className={styles["desc"]}>
                Delivered specialized front-end and interactive web development
                services for diverse clients, including local businesses, a
                national startup, an international charity, and a pharmaceutical
                manufacturer.
              </p>

              <p className={styles["scope"]}>
                <span>Technical Scope:</span> Angular 7-8, TypeScript, React,
                SVG, SCSS, Elasticsearch, Craft CMS, Adobe Creative Suite
              </p>

              <ul>
                <li>
                  Developed an animated informational UI using <b>React Move</b>{" "}
                  for the Committee for Children, a nonprofit supporting
                  education of millions of children across 70 countries.
                </li>
                <li>
                  Built a law enforcement employment application tracking system
                  leveraging Angular and <b>Elasticsearch</b>, consuming{" "}
                  <b>GraphQL</b> for efficient backend integration.
                </li>
                <li>
                  Created and deployed an admin interface for a Spokane
                  construction company website using <b>Craft CMS</b>
                </li>
                <li>
                  Produced animations in vanilla JavaScript and CSS3 for
                  websites and banner ads for Novo Nordisk, enhancing user
                  engagement for a multinational pharmaceutical company.
                </li>
                <li>
                  Prototyped a legal investigation application in <b>Angular</b>{" "}
                  to process and analyze large volumes of company documents
                  efficiently.
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/s2.svg"
                className={styles["cv-logo"]}
                alt="Seven2"
              />
            </div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>
                    Seven2 Interactive
                    <span className={styles["location"]}> — Spokane, WA</span>
                  </h5>
                  Interactive / Front-end Web Developer
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2018 - 2019 ]</div>
              </div>

              <p className={styles["desc"]}>
                Delivered interactive and responsive websites for Fortune 500
                companies in the technology and entertainment industries.
                Focused on high-performance animations, user interactivity,
                accessibility, and streamlined development processes under tight
                deadlines.
              </p>

              <p className={styles["scope"]}>
                <span>Technical Scope:</span> Angular 6-8, Typescript, RxJS,
                jQuery, Craft CMS, Grunt/Gulp, Handlebars, CreateJS, Adobe
                Creative Suite
              </p>

              <ul>
                <li>
                  Designed and implemented logic for interactive activities like
                  site-wide scavenger hunts and wallpaper creators for
                  responsive websites supporting Nintendo game launches.
                </li>
                <li>
                  Optimized UI elements for accessibility by applying{" "}
                  <b>WCAG</b> best practices for keyboard navigation and screen
                  reader compatibility.
                </li>
                <li>
                  Contributed to the development of single-page applications (
                  <b>SPA</b>s) using TypeScript and Angular 6+, ensuring
                  scalability and modern functionality.
                </li>
                <li>
                  Engineered a custom JavaScript timeline animation framework
                  with compact syntax, eliminating inconsistencies in CSS3
                  keyframe animations while maintaining support for legacy
                  browsers like IE.
                </li>
                <li>
                  Provided technical oversight and contributed to concept
                  development in collaboration with designers, developers, and
                  animators, ensuring alignment through Trello-managed
                  workflows.
                </li>
                <li>
                  Implemented <b>localization</b> strategies to optimize
                  international deployments, addressing unique design and
                  content challenges across regions.
                </li>
                <li>
                  Built a zero-dependency, <b>vanilla JavaScript</b> carousel
                  component for Comics Kingdom, enabling seamless embedding by
                  local newspaper websites.
                </li>
                <li>
                  Delivered under extremely tight deadlines, often starting
                  development before client design approvals to meet launch
                  dates.
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/chalklabs.svg"
                className={styles["cv-logo"]}
                alt="ChalkLabs Logo"
              />
            </div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>
                    ChalkLabs
                    <span className={styles["location"]}> — Spokane, WA</span>
                  </h5>
                  UI Developer / Designer
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2017 - 2018 ]</div>
              </div>

              <p className={styles["desc"]}>
                Designed and developed user interfaces for web applications
                aimed at helping government organizations process, analyze, and
                visualize data. Contributed to mission-critical projects under
                tight deadlines, showcasing rapid learning and adaptability.
              </p>

              <p className={styles["scope"]}>
                <span>Technical Scope:</span> Angular 4-6, TypeScript, Mapbox,
                Rest APIs, GraphQL, Data Visualizations, Adobe Create Suite
              </p>

              <ul>
                <li>
                  Consumed an HTTP search API utilizing a custom domain-specific
                  query language embedded in URL parameters, supporting logical
                  operators, field-based queries, and similarity matching for
                  ChalkLabs' flagship <b>SaaS</b> software, Pushgraph
                </li>
                <li>
                  Independently developed the Pushgraph dashboard drag-and-drop
                  widget framework for end user customization, utilizing Angular
                  component factory methods and local storage.
                </li>
                <li>
                  Designed the entire UI for the new iteration of Pushgraph in
                  under three days with minimal instruction and ramp-up.
                </li>
                <li>
                  Created many widgets for the system including
                  infinite-scrolling data grids and data visualizations using
                  <b>D3</b>, <b>Mapbox</b>, <b>Highcharts</b>, and other
                  visualization libraries.
                </li>
                <li>
                  Quickly learned Angular and TypeScript in the role,
                  progressing from initial training to delivering
                  production-ready solutions under heavy development demands.
                </li>
                <li>
                  Scoped, time-lined, and estimated tasks for sprint management
                  in a <b>Kanban</b> workflow, tracked via <b>Smartsheet</b>.
                </li>
                <li>
                  Consumed <b>Rest APIs</b> to manage users, configuration
                  settings, and data processed by the Pushgraph application and
                  other projects.
                </li>
                <li>
                  Worked over 350 hours in June 2017 with a supervisor to meet a
                  critical $5M contract deadline, ensuring the company's
                  viability.
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/s2.svg"
                className={styles["cv-logo"]}
                alt="Seven2 Logo"
              />
            </div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>
                    Seven2 Interactive
                    <span className={styles["location"]}> — Spokane, WA</span>
                  </h5>
                  Lead Flash / Interactive Web Developer
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2005 - 2016 ]</div>
              </div>

              <p className={styles["desc"]}>
                Led the development of interactive websites, browser games, and
                web advertising for nationally recognized corporations in
                technology and entertainment. Delivered innovative solutions
                under tight deadlines while mentoring junior developers and
                shaping technical strategies.
              </p>

              <p className={styles["scope"]}>
                <span>Technical Scope:</span> ActionScript 3, ActionScript 2,
                JavaScript, jQuery, Require/AMD, Haxe, Flash, Adobe Create Suite
              </p>

              <ul>
                <li>
                  Mastered <b>AS2</b>, <b>AS3</b>, and <b>Haxe</b> (all very
                  similar to JavaScript) on the job, applying their frameworks
                  and design patterns to deliver hundreds of diverse
                  cutting-edge interactive experiences.
                </li>
                <li>
                  Engineered flexible templates and frameworks in AS3, used by
                  teams of developers and animators to collaboratively build
                  games and interactive content.
                </li>
                <li>
                  Served as the lead developer for several first iterations of
                  AT&amp;T's projects, including their data usage calculators
                  and first-ever app store, authored in vanilla JavaScript and
                  Require/AMD.
                </li>
                <li>
                  Led Seven2's first Nickelodeon Group project: Blue's Clues —
                  Mix 'N Match Dressup, built in Flash/ActionScript.
                </li>
                <li>
                  Rescued a high-visibility AT&T project by creating a
                  video-based workaround for an incorrectly scoped JavaScript
                  feature, achieving over 90 million interactions in one week.
                </li>
                <li>
                  Developed custom audio and video players for MTV's
                  high-production websites using AS3.
                </li>
                <li>
                  Designed and implemented a performant physics-based tween
                  engine in AS3, preceding industry-standard systems like
                  Tweener and GSAP.
                </li>
                <li>
                  Contributed a cross-platform <b>mobile accelerometer</b>{" "}
                  solution to Flambé (now 2Dkit), a leading HTML5 and
                  cross-platform game framework.
                </li>
                <li>
                  Built APIs for managing <b>JSON</b>, <b>XML</b>, and{" "}
                  <b>CSV</b> data exchanges, enabling user-driven
                  server/database interactions with zero-dependency JavaScript
                  and AS3 solutions.
                </li>
                <li>
                  Played a critical role in project conceptualization,
                  contributing to multiple award-winning projects at annual
                  Spokane Ad Fed events.
                </li>
                <li>
                  Worked 350+ hours in June 2014 to meet a critical WildBrain
                  deadline.
                </li>
                <li>
                  Led front-end development of a Webby Award-winning project
                  (2008 People's Choice Art Website of the Year).
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/scw.svg"
                className={styles["cv-logo"]}
                alt="SCW Logo"
              />
            </div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>
                    SCW Consulting
                    <span className={styles["location"]}> — Spokane, WA</span>
                  </h5>
                  Designer / Front-end Web Developer
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2005 ]</div>
              </div>

              <p className={styles["desc"]}>
                Designed and developed websites and applications for local
                businesses with C#/.NET backends, establishing online presences
                for clients while overcoming resource limitations.
              </p>

              <p className={styles["scope"]}>
                <span>Technical Scope:</span> HTML, CSS, Vanilla JavaScript,
                Visual Studio, AJAX, Dynamic HTML, and Adobe Create Suite
              </p>

              <ul>
                <li>
                  Served as the sole designer, crafting the look, feel, and
                  branding for businesses entering the online space for the
                  first time.
                </li>
                <li>
                  Designed and developed SCW's reusable <b>e-commerce</b>
                  /shopping cart platform, which was ahead of its time,
                  preceding modern solutions like Shopify.
                </li>
                <li>
                  Delivered major site revisions under 50% of the allocated
                  budget, impressing the agency owner with efficiency and
                  resourcefulness.
                </li>
                <li>
                  Created innovative shortcuts and development tricks leveraging
                  extensive knowledge of DHTML, introducing new approaches to
                  the team.
                </li>
                <li>
                  Overcame limited budgets by maximizing creativity and
                  resourcefulness, producing impactful designs despite a lack of
                  stock photography and professional fonts.
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/bb.svg"
                className={styles["cv-logo"]}
                alt="BB Interactive Logo"
              />
            </div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>
                    Freelance
                    <span className={styles["location"]}> — Spokane, WA</span>
                  </h5>
                  Designer / Front-end Web Developer
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2003 - 2005 ]</div>
              </div>

              <p className={styles["desc"]}>
                Design and development of interactive websites for businesses in
                the Spokane area concurrently while in web design school at SFCC
              </p>

              <p className={styles["scope"]}>
                <span>Technical Scope:</span> XML, XSL, Vanilla JavaScript,
                Dynamic HTML, PHP
              </p>

              <ul>
                <li>
                  Conceptualizing creative UI and navigation concepts in
                  websites for a variety of businesses in the Spokane area
                </li>
                <li>
                  Dynamic, multi-level navigation redesign and development for
                  The Heart Institute of Spokane
                </li>
                <li>
                  Utilized XML and XSL in an astonishingly simple and effective
                  CMS-like approach for retailing refurbished fitness equipment
                </li>
                <li>
                  Produced websites and other paying freelance projects that met
                  criteria and so received credit for school curriculum
                </li>
                <li>
                  In the program I was considerably ahead all the other
                  students, having history in Photoshop, HTML, JavaScript and
                  art, I unofficially tutored other students any time I was in
                  the lab, and was widely regarded as a prodigy by faculty and
                  fellow students.
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}
        </div>

        <div className={"container"}>
          <h4>Formal Education</h4>
        </div>

        <div className={"container"}>
          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/sfcc.svg"
                className={styles["cv-logo"]}
                alt="SFCC Logo"
              />
            </div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>
                    Spokane Falls Community College
                    <span className={styles["location"]}> — Spokane, WA</span>
                  </h5>
                  A.A.S. Web Design — Honors
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2003 - 2005 ]</div>
              </div>

              <p className={styles["desc"]}>
                Recognized with multiple first-place awards; select works
                published officially for the college.
              </p>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4>Early Development Journey</h4>
        </div>

        <div className={"container"}>
          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                src="/images/cv/bv.svg"
                className={styles["cv-logo"]}
                alt="Hand Logo"
              />
            </div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>
                    Hobbyist
                    <span className={styles["location"]}> — Spokane, WA</span>
                  </h5>
                  Interactive Web Enthusiast
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2001 - 2003 ]</div>
              </div>

              <p className={styles["desc"]}>
                Self-directed learning of graphics software and early
                cross-platform, dynamic, and interactive JavaScript development
                before formally pursuing design school. My history with vanilla
                JavaScript spans back to this era.
              </p>

              <p className={styles["scope"]}>
                <span>Technical Scope:</span> Vanilla JavaScript, HTML, CSS,
                Dynamic HTML, PHP, and Adobe Create Suite
              </p>

              <ul>
                <li>
                  Pursued self-directed learning in{" "}
                  <b>JavaScript, Dynamic HTML, and interactive animation</b>{" "}
                  while working full-time in a non-technical role.
                </li>
                <li>
                  Built early browser-based UI experiments, including functional
                  custom chrome (navigation bars, menus, etc.) and a
                  slot-machine game.
                </li>
                <li>
                  Tackled cross-platform compatibility challenges in a
                  fragmented browser era, delivering interactive, animated
                  solutions without Flash.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4>Technologies and Tools</h4>
        </div>

        <div className={"container"}>
          <div className={rowClass}>
            <div className={divClassLt}></div>
            <div className={divClassRt}>
              <h5>Languages</h5>
              <p>{wrapPhrases(lang)}</p>
            </div>
            <div className={divClassLt}></div>
            <div className={divClassRt}>
              <h5>Technologies</h5>
              <p>{wrapPhrases(tech)}</p>
            </div>
            <div className={divClassLt}></div>
            <div className={divClassRt}>
              <h5>Concepts</h5>
              <p>{wrapPhrases(concepts)}</p>
            </div>
            <div className={divClassLt}></div>
            <div className={divClassRt}>
              <h5>Software</h5>
              <p>{wrapPhrases(software)}</p>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4>Achievements</h4>
        </div>

        <div className={"container"}>
          <div className={rowClass}>
            <div className={divClassLt}></div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>14 gold badges on Stack Overflow</h5>
                  <div className={`${styles["badges"]} col-xs-12`}>
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                    <img src="/images/cv/gold-badge.svg" alt="" />
                  </div>
                </div>
              </div>
              <div className={`${styles["desc"]} col-xs-12`}>
                Reputation: ~7,000
              </div>
            </div>
            <div className={divClassLt}></div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>The Webby Awards</h5>
                  International
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2008 ]</div>
              </div>

              <div className={`${styles["desc"]} col-xs-12`}>
                People's Choice — Art Website of the Year — Artocracy.org
              </div>
            </div>
            <div className={divClassLt}></div>
            <div className={divClassRt}>
              <div className={styles["sub-container"]}>
                <div className={styles["left-sub"]}>
                  <h5>American Advertising Federation</h5>
                  Spokane
                </div>
                <div className={styles["break"]}></div>
                <div className={styles["right-sub"]}>[ 2009 - 2019 ]</div>
              </div>

              <div className={`${styles["desc"]} col-xs-12`}>
                Contributed to over thirteen projects that received awards in
                the annual Spokane Ad Fed (Addy) Awards, including five Silver,
                four Gold, two Best of Division, one Best of Show, and one
                Golden Pixel
              </div>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4>Clients</h4>
        </div>

        <div className={"container"}>
          <div className={rowClass}>
            <div className={divClassLt}></div>

            <div className={divClassRt}>
              <p>{wrapPhrases(clients)}</p>
            </div>
          </div>

          {/*TempMessage.message()*/}

          {/*///////////////////////////////////////////////////////////////////////////////*/}
        </div>
      </div>
    </div>
  );
};

export default CurriculumVitae;
