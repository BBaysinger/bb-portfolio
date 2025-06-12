import React from "react";

import HeaderSub from "components/layout/HeaderSub";
import useInViewAnimation from "hooks/useInViewAnimation";
import styles from "./CurriculumVitae.module.scss";

/**
 * CV Page. Mostly static HTML, with some helper functions for formatting.
 *
 * TODO: Sections should be modularized into reusable components.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const CurriculumVitae: React.FC = () => {
  const addToRefs = useInViewAnimation("in-view");

  /**
   * Wraps phrases into styled span elements for display.
   *
   * @param {Array<string>} phrases - List of phrases to format.
   * @returns {React.ReactNode[]} Wrapped JSX elements.
   */
  const wrapPhrases = (phrases: string[]): React.ReactNode[] => {
    return phrases.map((data, i) => (
      <span className={styles.inlineListItem} key={i}>
        <span className={styles.phrase}>{data}</span>
        <span className={styles.bullet}>
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

  const projectTypes = [
    // Games & Interactive Entertainment
    "Escape Games",
    "Shooter Games",
    "Platformer Games",
    "Puzzle Games",
    "Edutainment Games",
    "Skill Games",
    "Tactical Movement Games",
    "Dress-Up Games",
    "Magnetic Poetry Games",
    "Drawing Utilities",
    "Wallpaper Generators",

    // Media & Content Players
    "Audio Players",
    "Video Players",
    "360° Video Players",
    "Animated E-Cards",
    "Screensavers",

    // Interactive Web Experiences
    "Quizzes",
    "Surveys and Forms",
    "Sweepstakes Activities",
    "Photo Upload Personalization",
    "Drag-and-Drop Builders",
    "Interactive Tutorials",
    "Virtual Tours",
    "Call-a-Friend Message Builders",
    "Movie/TV Show Tie-Ins",
    "Site Release Reveals",
    "Media/Timeline Sequencers",
    "Interactive Slideshows",
    "Configurable Sprite Sheet Player",

    // Business, Marketing & Utility
    "Synced Banner Advertising",
    "Microsites",
    "Product Demos",
    "Product Catalogs",
    "App Store",
    "Custom Navigation Menus",
    "Custom Scrollbars",
    "Custom Tween Engine",
    "Data Usage Calculators",
    "Data Science Application",
    "Interactive Portfolio",
    "Informational Presentations",
    "HTML Emails",
    "Email Consent Workflows",
  ];

  const brands = [
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
    "RedHook Brewing",
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

  const divClassLt = `col-xs-12 col-sm-12 col-md-3 col-lg-3 ${styles.cvLeft}`;
  const divClassRt = `col-xs-12 col-sm-12 col-md-9 col-lg-9 ${styles.cvRight}`;
  const rowClass = `row ${styles.row}`;

  return (
    <div>
      <HeaderSub head={"Curriculum Vitae"} />

      <section
        id="mainContent"
        className={`cvPage ${styles.cvPage} standardPage`}
      >
        <div className={`container ${styles.summary}`}>
          <h4 ref={addToRefs}>Summary</h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                ref={addToRefs}
                src="/images/cv/dart.svg"
                className={styles.cvLogo}
                alt="Dart Logo"
              />
            </div>

            <div ref={addToRefs} className={divClassRt}>
              <p>
                A developer with a unique background in design, technical
                animation, and interactive development. From game development to
                scalable front-end solutions, I bridge creativity with
                technology to craft engaging user experiences. After delivering
                award-winning interactive projects in Flash, I transitioned
                seamlessly to modern frameworks like Angular and React, building
                reusable, high-performance components. With a results-driven
                approach, I've helped Fortune 500 companies, entertainment
                giants, and startups create polished, impactful digital
                experiences.
              </p>
            </div>
          </div>
        </div>

        <div className={`container ${styles.strengths}`}>
          <h4 ref={addToRefs}>Core Strengths</h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                ref={addToRefs}
                src="/images/cv/wrench.svg"
                className={styles.cvLogo}
                alt="Wrench Logo"
              />
            </div>

            <div className={divClassRt}>
              <h5 ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>Modern Front-End Development</h5>
                </div>
                <div className={styles.break}></div>
              </h5>

              <ul ref={addToRefs}>
                <li>
                  Angular (2+ years): Advanced component architecture, RxJS, and
                  SCSS integration
                </li>
                <li>
                  TypeScript (3+ years): Strong typing (with further history in
                  strongly-typed ECMAScript)
                </li>
                <li>
                  React (Growing expertise): Reusable components, state
                  management, Redux, hooks, dynamic routing, and JSX
                </li>
              </ul>

              <h5 ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>Creative Problem-Solving</h5>
                </div>
                <div className={styles.break}></div>
              </h5>

              <ul ref={addToRefs}>
                <li>
                  Animation & UI Design: Transitioned from award-winning
                  Flash/AS3 projects to modern CSS/JS animations
                </li>
                <li>
                  Interactive Web Development: Built engaging tools like data
                  explorers and Canvas and SVG UIs
                </li>
              </ul>

              <h5 ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>Design &amp; Animation Background</h5>
                </div>
                <div className={styles.break}></div>
              </h5>

              <ul ref={addToRefs}>
                <li>
                  Strong foundation in design principles with deep experience in
                  Adobe Creative Suite
                </li>
                <li>
                  Extensive experience with technical UI animation techniques,
                  including the development of physics-based custom tween
                  solutions for interactive projects
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

        <div className={"container"}>
          <h4 ref={addToRefs}>Professional Experience</h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                ref={addToRefs}
                src="/images/cv/epsilon.svg"
                className={styles.cvLogo}
                alt="Epsilon Logo"
              />
            </div>
            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>
                    Epsilon
                    <span className={styles.location}>
                      {" "}
                      — Irving, TX | Remote | W2
                    </span>
                  </h5>
                  Front-end Developer
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2021 - 2024 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Interactive and responsive websites for Fortune 500 companies in
                banking, pharmaceuticals, and entertainment
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> jQuery, Adobe Suite, Sitecore,
                HTML Email, Salesforce, OneTrust, FreeMarker
              </p>

              <ul>
                <li ref={addToRefs}>
                  Implemented dynamic UI components, such as forms with
                  validation, data-driven informational grids, global
                  navigation, and collapsible menus for the Golden 1 Credit
                  Union website, leveraging jQuery and <b>Sitecore</b> CMS
                  integration.
                </li>
                <li ref={addToRefs}>
                  Built and maintained reusable, modular email components in{" "}
                  <b>Salesforce</b> Marketing Cloud. Streamlined and
                  standardized email production using preprocessing, ensuring
                  brand consistency across campaigns.
                </li>
                <li ref={addToRefs}>
                  Optimized email campaigns with <b>Litmus</b> testing for
                  multi-device compatibility, including dark mode and
                  double-density graphics, achieving high deliverability and
                  consistent rendering.
                </li>
                <li ref={addToRefs}>
                  Created the Oncotype DX Breast Recurrence Score Report
                  Explorer for the Exact Sciences website, helping users
                  understand diagnostic results documents. Converted Figma
                  designs into responsive and interactive web pages and
                  components, ensuring pixel-perfect implementation and seamless
                  user experience across all devices.
                </li>
                <li ref={addToRefs}>
                  Developed consent management workflows using{" "}
                  <b>Apache FreeMarker</b> for <b>OneTrust</b> integration,
                  facilitating seamless data exchange across platforms like
                  MuleSoft and Veeva, enhancing compliance and user experience
                  through event-driven and scheduled processes.
                </li>
                <li ref={addToRefs}>
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
                ref={addToRefs}
                src="/images/cv/bb.svg"
                className={styles.cvLogo}
                alt="BB Interactive Logo"
              />
            </div>
            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>
                    BB Interactive
                    <span className={styles.location}>
                      {" "}
                      — Spokane, WA | Remote
                    </span>
                  </h5>
                  Front-end / Interactive Web Developer
                  <div className={styles.parenthetical}>
                    [Independent Contractor]
                  </div>
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2020 - 2021 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Delivered specialized front-end and interactive web development
                services for diverse clients, including local businesses, a
                national startup, an international charity, and a pharmaceutical
                manufacturer.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> Angular 7-8, TypeScript, React,
                SVG, SCSS, Elasticsearch, Craft CMS, Adobe Creative Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Developed an animated informational UI using <b>React Move</b>{" "}
                  for the Committee for Children, a nonprofit supporting
                  education of millions of children across 70 countries.
                </li>
                <li ref={addToRefs}>
                  Built a law enforcement employment application tracking system
                  leveraging Angular and <b>Elasticsearch</b>, consuming{" "}
                  <b>GraphQL</b> for efficient backend integration.
                </li>
                <li ref={addToRefs}>
                  Created and deployed an admin interface for a Spokane
                  construction company website using <b>Craft CMS</b>
                </li>
                <li ref={addToRefs}>
                  Produced animations in vanilla JavaScript and CSS3 for
                  websites and banner ads for Novo Nordisk, enhancing user UI/UX
                  engagement for a multinational pharmaceutical company.
                </li>
                <li ref={addToRefs}>
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
                ref={addToRefs}
                src="/images/cv/s2.svg"
                className={styles.cvLogo}
                alt="Seven2"
              />
            </div>
            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>
                    Seven2 Interactive
                    <span className={styles.location}> — Spokane, WA</span>
                  </h5>
                  Interactive / Front-end Web Developer
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2018 - 2019 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Delivered interactive and responsive websites for Fortune 500
                companies in the technology and entertainment industries.
                Focused on high-performance animations, user interactivity,
                accessibility, and streamlined development processes under tight
                deadlines.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> Angular 6-8, Typescript, RxJS,
                jQuery, Craft CMS, Grunt/Gulp, Handlebars, CreateJS, Adobe
                Creative Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Converted Sketch designs into responsive and interactive web
                  pages and components, ensuring pixel-perfect implementation
                  and seamless user experience across all devices.
                </li>

                <li ref={addToRefs}>
                  Designed and implemented logic for interactive activities like
                  site-wide scavenger hunts and wallpaper creators for
                  responsive websites supporting Nintendo game launches.
                </li>
                <li ref={addToRefs}>
                  Optimized UI elements for accessibility by applying{" "}
                  <b>WCAG</b> best practices for keyboard navigation and screen
                  reader compatibility.
                </li>
                <li ref={addToRefs}>
                  Contributed to the development of single-page applications (
                  <b>SPA</b>s) using TypeScript and Angular 6+, ensuring
                  scalability and modern functionality.
                </li>
                <li ref={addToRefs}>
                  Engineered a custom JavaScript timeline animation framework
                  with compact syntax, eliminating inconsistencies in CSS3
                  keyframe animations while maintaining support for legacy
                  browsers like IE.
                </li>
                <li ref={addToRefs}>
                  Provided technical oversight and contributed to concept
                  development in collaboration with designers, developers, and
                  animators, ensuring alignment through Trello-managed
                  workflows.
                </li>
                <li ref={addToRefs}>
                  Implemented <b>localization</b> strategies to optimize
                  international deployments, addressing unique design and
                  content challenges across regions.
                </li>
                <li ref={addToRefs}>
                  Integrated with Nintendo's Nclood API for managing user
                  statuses and rewards systems.
                </li>
                <li ref={addToRefs}>
                  Built a zero-dependency, <b>vanilla JavaScript</b> carousel
                  component for Comics Kingdom, enabling seamless embedding by
                  local newspaper websites.
                </li>
                <li ref={addToRefs}>
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
                ref={addToRefs}
                src="/images/cv/chalklabs.svg"
                className={styles.cvLogo}
                alt="ChalkLabs Logo"
              />
            </div>
            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>
                    ChalkLabs
                    <span className={styles.location}> — Spokane, WA</span>
                  </h5>
                  UI Developer / Designer
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2017 - 2018 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Designed and developed user interfaces for web applications
                aimed at helping government organizations process, analyze, and
                visualize data. Contributed to mission-critical projects under
                tight deadlines, showcasing rapid learning and adaptability.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> Angular 4-6, TypeScript, Mapbox,
                Rest APIs, GraphQL, Data Visualizations, Adobe Create Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Consumed an HTTP search API utilizing a custom domain-specific
                  query language embedded in URL parameters, supporting logical
                  operators, field-based queries, and similarity matching for
                  ChalkLabs' flagship <b>SaaS</b> software, Pushgraph
                </li>
                <li ref={addToRefs}>
                  Independently developed the Pushgraph dashboard drag-and-drop
                  widget framework for end user customization, utilizing Angular
                  component factory methods and local storage.
                </li>
                <li ref={addToRefs}>
                  Designed the entire UI for the new iteration of Pushgraph in
                  under three days with minimal instruction and ramp-up.
                </li>
                <li ref={addToRefs}>
                  Created many widgets for the system including
                  infinite-scrolling data grids and data visualizations using
                  <b>D3</b>, <b>Mapbox</b>, <b>Highcharts</b>, and other
                  visualization libraries.
                </li>
                <li ref={addToRefs}>
                  Quickly learned Angular and TypeScript in the role,
                  progressing from initial training to delivering
                  production-ready solutions under heavy development demands.
                </li>
                <li ref={addToRefs}>
                  Scoped, time-lined, and estimated tasks for sprint management
                  in a <b>Kanban</b> workflow, tracked via <b>Smartsheet</b>.
                </li>
                <li ref={addToRefs}>
                  Consumed <b>Rest APIs</b> to manage users, configuration
                  settings, and data processed by the Pushgraph application and
                  other projects.
                </li>
                <li ref={addToRefs}>
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
                ref={addToRefs}
                src="/images/cv/s2.svg"
                className={styles.cvLogo}
                alt="Seven2 Logo"
              />
            </div>
            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>
                    Seven2 Interactive
                    <span className={styles.location}> — Spokane, WA</span>
                  </h5>
                  Lead Flash / Interactive Web Developer
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2005 - 2016 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Led the development of interactive websites, browser games, and
                web advertising for nationally recognized corporations in
                technology and entertainment. Delivered innovative solutions
                under tight deadlines while mentoring junior developers and
                shaping technical strategies.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> ActionScript 3, ActionScript 2,
                JavaScript, jQuery, Require/AMD, Haxe, Flash, Adobe Create Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Mastered <b>AS2</b>, <b>AS3</b>, and <b>Haxe</b> (all very
                  similar to JavaScript) on the job, applying their frameworks
                  and design patterns to deliver hundreds of diverse
                  cutting-edge interactive experiences.
                </li>
                <li ref={addToRefs}>
                  Engineered flexible templates and frameworks in AS3, used by
                  teams of developers and animators to collaboratively build
                  games and interactive content.
                </li>
                <li ref={addToRefs}>
                  Served as the lead developer for several first iterations of
                  AT&amp;T's projects, including their data usage calculators
                  and first-ever app store, authored in vanilla JavaScript and
                  Require/AMD.
                </li>
                <li ref={addToRefs}>
                  Led Seven2's first Nickelodeon Group project: Blue's Clues —
                  Mix 'N Match Dressup, built in Flash/ActionScript.
                </li>
                <li ref={addToRefs}>
                  Rescued a high-visibility AT&T project by creating a
                  video-based workaround for an incorrectly scoped JavaScript
                  feature, achieving over 90 million interactions in one week.
                </li>
                <li ref={addToRefs}>
                  Developed custom audio and video players for MTV's
                  high-production websites using AS3.
                </li>
                <li ref={addToRefs}>
                  Designed and implemented a performant physics-based tween
                  engine in AS3, preceding industry-standard systems like
                  Tweener and GSAP.
                </li>
                <li ref={addToRefs}>
                  Contributed a cross-platform <b>mobile accelerometer</b>{" "}
                  solution to Flambé (now 2Dkit), a leading HTML5 and
                  cross-platform game framework.
                </li>
                <li ref={addToRefs}>
                  Built APIs for managing <b>JSON</b>, <b>XML</b>, and{" "}
                  <b>CSV</b> data exchanges, enabling user-driven
                  server/database interactions with zero-dependency JavaScript
                  and AS3 solutions.
                </li>
                <li ref={addToRefs}>
                  Played a critical role in project conceptualization,
                  contributing to multiple award-winning projects at annual
                  Spokane Ad Fed events.
                </li>
                <li ref={addToRefs}>
                  Worked 350+ hours in June 2014 to meet a critical deadline for
                  our WildBrain client.
                </li>
                <li ref={addToRefs}>
                  Led front-end development of a <b>Webby Award</b>-winning
                  project (2008 People's Choice Art Website of the Year).
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                ref={addToRefs}
                src="/images/cv/scw.svg"
                className={styles.cvLogo}
                alt="SCW Logo"
              />
            </div>
            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>
                    SCW Consulting
                    <span className={styles.location}> — Spokane, WA</span>
                  </h5>
                  Designer / Front-end Web Developer
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2005 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Designed and developed websites and applications for local
                businesses with C#/.NET backends, establishing online presences
                for clients while overcoming resource limitations.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> HTML, CSS, Vanilla JavaScript,
                Visual Studio, AJAX, Dynamic HTML, and Adobe Create Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Served as the sole designer, crafting the look, feel, and
                  branding for businesses entering the online space for the
                  first time.
                </li>
                <li ref={addToRefs}>
                  Designed and developed SCW's reusable <b>e-commerce</b>
                  /shopping cart platform, which was ahead of its time,
                  preceding modern solutions like Shopify.
                </li>
                <li ref={addToRefs}>
                  Delivered major site revisions under 50% of the allocated
                  budget, impressing the agency owner with efficiency and
                  resourcefulness.
                </li>
                <li ref={addToRefs}>
                  Created innovative shortcuts and development tricks leveraging
                  extensive knowledge of DHTML, introducing new approaches to
                  the team.
                </li>
                <li ref={addToRefs}>
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
                ref={addToRefs}
                src="/images/cv/bb.svg"
                className={styles.cvLogo}
                alt="BB Interactive Logo"
              />
            </div>
            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>
                    Freelance
                    <span className={styles.location}> — Spokane, WA</span>
                  </h5>
                  Designer / Front-end Web Developer
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2003 - 2005 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Design and development of interactive websites for businesses in
                the Spokane area concurrently while in web design school at SFCC
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> XML, XSL, Vanilla JavaScript,
                Dynamic HTML, PHP
              </p>

              <ul>
                <li ref={addToRefs}>
                  Conceptualizing creative UI and navigation concepts in
                  websites for a variety of businesses in the Spokane area
                </li>
                <li ref={addToRefs}>
                  Dynamic, multi-level navigation redesign and development for
                  The Heart Institute of Spokane
                </li>
                <li ref={addToRefs}>
                  Utilized XML and XSL in an astonishingly simple and effective
                  CMS-like approach for retailing refurbished fitness equipment
                </li>
                <li ref={addToRefs}>
                  Produced websites and other paying freelance projects that met
                  criteria and so received credit for school curriculum
                </li>
                <li ref={addToRefs}>
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
          <h4 ref={addToRefs}>Formal Education</h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                ref={addToRefs}
                src="/images/cv/sfcc.svg"
                className={styles.cvLogo}
                alt="SFCC Logo"
              />
            </div>
            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>
                    Spokane Falls Community College
                    <span className={styles.location}> — Spokane, WA</span>
                  </h5>
                  A.A.S. Web Design — Honors
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2003 - 2005 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Recognized with multiple first-place awards; select works
                published officially for the college.
              </p>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Early Development Journey</h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <img
                ref={addToRefs}
                src="/images/cv/bv.svg"
                className={styles.cvLogo}
                alt="Hand Logo"
              />
            </div>
            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>
                    Hobbyist
                    <span className={styles.location}> — Spokane, WA</span>
                  </h5>
                  Interactive Web Enthusiast
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2001 - 2003 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Self-directed learning of graphics software and early
                cross-platform, dynamic, and interactive JavaScript development
                before formally pursuing design school. My history with vanilla
                JavaScript spans back to this era.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> Vanilla JavaScript, HTML, CSS,
                Dynamic HTML, PHP, and Adobe Create Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Pursued self-directed learning in{" "}
                  <b>JavaScript, Dynamic HTML, and interactive animation</b>{" "}
                  while working full-time in a non-technical role.
                </li>
                <li ref={addToRefs}>
                  Built early browser-based UI experiments, including functional
                  custom chrome (navigation bars, menus, etc.) and a
                  slot-machine game.
                </li>
                <li ref={addToRefs}>
                  Tackled cross-platform compatibility challenges in a
                  fragmented browser era, delivering interactive, animated
                  solutions without Flash.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Technologies and Tools</h4>

          <div className={rowClass}>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Languages</h5>
              <p>{wrapPhrases(lang)}</p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Technologies</h5>
              <p>{wrapPhrases(tech)}</p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Concepts</h5>
              <p>{wrapPhrases(concepts)}</p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Software</h5>
              <p>{wrapPhrases(software)}</p>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Achievements</h4>

          <div className={rowClass}>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <div className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>14 gold badges on Stack Overflow</h5>
                  <div className={`${styles.badges} col-xs-12`}>
                    {Array.from({ length: 14 }, (_, index) => (
                      <img key={index} src="/images/cv/gold-badge.svg" alt="" />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`${styles.desc} col-xs-12`}>
                Reputation: ~6,900
              </div>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <div className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>The Webby Awards</h5>
                  International
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2008 ]</div>
              </div>

              <div className={`${styles.desc} col-xs-12`}>
                People's Choice — Art Website of the Year — Artocracy.org
              </div>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <div className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>American Advertising Federation</h5>
                  Spokane
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2009 - 2019 ]</div>
              </div>

              <div className={`${styles.desc} col-xs-12`}>
                Contributed to over thirteen projects that received awards in
                the annual Spokane Ad Fed (Addy) Awards, including five Silver,
                four Gold, two Best of Division, one Best of Show, and one
                Golden Pixel
              </div>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Projects Delivered</h4>

          <div className={rowClass}>
            <div className={divClassLt}></div>

            <div ref={addToRefs} className={divClassRt}>
              <p>{wrapPhrases(projectTypes)}</p>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Brands</h4>

          <div className={rowClass}>
            <div className={divClassLt}></div>

            <div ref={addToRefs} className={divClassRt}>
              <p>{wrapPhrases(brands)}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CurriculumVitae;
