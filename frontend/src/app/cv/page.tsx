"use client";

import clsx from "clsx";
import React from "react";

import { RawImg } from "@/components/common/RawImg";
import HeaderSub from "@/components/layout/HeaderSub";
import useInViewAnimation from "@/hooks/useInViewAnimation";

import styles from "./CvPage.module.scss";

const InlineListItem = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <span className={styles.inlineListItem}>
    <span className={styles.phrase}>{children}</span>
    <span className={styles.bullet}>
      &nbsp;&bull;
      <span>&#32;</span>
    </span>
  </span>
);

/**
 * CV page.
 *
 * Mostly static (for now) content rendered client-side. We can apply in-view animations
 * via `useInViewAnimation`.
 *
 * Key implementation notes:
 * - Skills/brands/project types are authored inline as styled span lists.
 *
 * TODO: Consider modularizing sections into reusable components.
 * TODO: CMS-driving this content for easier updates.
 */
const CurriculumVitae: React.FC = () => {
  // Returns a callback ref. Attaching it to elements adds an "in-view" class
  // when they enter the viewport (used for scroll-triggered animations).
  const addToRefs = useInViewAnimation("in-view");

  const divClassLt = clsx(
    "col-xs-12",
    "col-sm-12",
    "col-md-3",
    "col-lg-3",
    styles.cvLeft,
  );
  const divClassRt = clsx(
    "col-xs-12",
    "col-sm-12",
    "col-md-9",
    "col-lg-9",
    styles.cvRight,
  );
  const rowClass = clsx("row", styles.row);

  return (
    <div>
      <HeaderSub head={"Curriculum Vitae"} />

      <section className={clsx("cvPage", styles.cvPage, "standardPage")}>
        <div className={clsx("container", styles.summary)}>
          <h4 ref={addToRefs}>
            Summary
            {/* Summary -{" "}
            <span className={styles.designMindedEngineer}>
              Design-Minded Engineer
            </span> */}
          </h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <RawImg
                ref={addToRefs}
                src="/images/cv/dart.svg"
                className={styles.cvLogo}
                alt="Dart Logo"
              />
            </div>

            <div ref={addToRefs} className={divClassRt}>
              <p>
                <strong>
                  Front-end / UI developer focused on interaction, visual
                  polish, and performance-sensitive web interfaces.
                </strong>
              </p>

              <p>
                Senior engineer with <strong>15+ years</strong> building
                production UI for enterprise and consumer products. Strong in{" "}
                <strong>HTML, CSS, and JavaScript</strong>, with experience
                using modern frameworks including{" "}
                <strong>React, TypeScript, Next.js, and Angular</strong> to ship
                reliable, accessible interfaces.
              </p>
            </div>
          </div>
        </div>

        <div className={clsx("container", styles.strengths)}>
          <h4 ref={addToRefs}>Core Strengths</h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <RawImg
                ref={addToRefs}
                src="/images/cv/wrench.svg"
                className={styles.cvLogo}
                alt="Wrench Logo"
              />
            </div>

            <div className={divClassRt}>
              <h5 ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>Modern UI Development</h5>
                </div>
                <div className={styles.break}></div>
              </h5>

              <ul ref={addToRefs}>
                <li>
                  React (2 years; current focus): Component-driven UI, hooks,
                  routing, and state management with Redux
                </li>
                <li>
                  Angular (2+ years): Enterprise component architecture, RxJS,
                  and SCSS-based theming
                </li>
                <li>
                  TypeScript (3+ years): Type-safe APIs and refactors, informed
                  by earlier work in strongly-typed ECMAScript (Haxe/AS3)
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
                  Animation & UI Design: Evolved award-winning Flash/AS3 motion
                  work into modern CSS/JS animation systems
                </li>
                <li>
                  Interactive Web Development: Built rich tools including data
                  explorers and Canvas/SVG-driven UI
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
                  Strong foundation in visual design with extensive Adobe
                  Creative Suite experience
                </li>
                <li>
                  Deep experience in technical animation, including
                  physics-based custom tweening systems for interactive work
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

        <div className={"container"}>
          <h4 ref={addToRefs}>Recent Independent Study &amp; R&amp;D</h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <RawImg
                ref={addToRefs}
                src="/images/cv/bb.svg"
                className={styles.cvLogo}
                alt="BB Logo"
              />
            </div>

            <div className={divClassRt}>
              <div ref={addToRefs} className={styles.subContainer}>
                <div className={styles.leftSub}>
                  <h5>Self-Directed Front-End Engineer</h5>
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2024 - 2025 ]</div>
              </div>

              <ul>
                <li ref={addToRefs}>
                  Designed and built a production-grade portfolio platform as a
                  proving ground for{" "}
                  <b>
                    advanced interaction patterns, animation systems, and UI
                    performance work
                  </b>
                  .
                </li>
                <li ref={addToRefs}>
                  Architected a modern stack using{" "}
                  <b>Next.js, React, TypeScript, Payload CMS</b>, and AWS-based
                  infrastructure.
                </li>
                <li ref={addToRefs}>
                  Built reusable interaction systems (route-synced carousels
                  with deep linking, layered/parallax coordination, responsive
                  layout strategies).
                </li>
                <li ref={addToRefs}>
                  Implemented production instrumentation and reliability hooks:
                  <b> CloudWatch RUM</b>, SSR-safe initialization guards,
                  lightweight health endpoints, and operational metric
                  publishing.
                </li>
                <li ref={addToRefs}>
                  Wrote and maintained unit and integration tests for React
                  applications.
                </li>
                <li ref={addToRefs}>
                  Automated delivery workflows including deployment
                  orchestration, environment/secrets bundling, and hardened
                  Docker builds.
                </li>
                <li ref={addToRefs}>
                  Standardized code quality and DX with strict TypeScript,
                  unified linting/formatting, and repeatable performance-tuned
                  builds.
                </li>
                <li ref={addToRefs}>
                  Built content and data workflows around Payload CMS (media
                  handling, scripted exports, and repeatable imports).
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Professional Experience</h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <RawImg
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
                Built interactive, responsive web experiences for Fortune 500
                clients across banking, pharmaceuticals, and entertainment.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> jQuery, Adobe Suite, Sitecore,
                HTML Email, Salesforce, OneTrust, FreeMarker
              </p>

              <ul>
                <li ref={addToRefs}>
                  Implemented dynamic UI components, validated forms,
                  data-driven informational grids, global navigation, and
                  collapsible menus for the Golden 1 Credit Union website,
                  integrating jQuery with <b>Sitecore</b>.
                </li>
                <li ref={addToRefs}>
                  Built and maintained reusable email components in{" "}
                  <b>Salesforce</b> Marketing Cloud; standardized production
                  with preprocessing to improve consistency and throughput.
                </li>
                <li ref={addToRefs}>
                  Hardened email rendering via <b>Litmus</b> testing across
                  clients/devices (including dark mode and @2x assets),
                  improving deliverability and consistency.
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
                  facilitating efficient data exchange across platforms like
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
              <RawImg
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
                  Interactive UI Web Developer
                  <div className={styles.parenthetical}>
                    [Independent Contractor]
                  </div>
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2020 - 2021 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Delivered specialized UI and interactive web development for
                diverse clients: local businesses, a national startup, an
                international charity, and a pharmaceutical manufacturer.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> Angular 7-8, TypeScript, React,
                SVG, SCSS, Elasticsearch, Craft CMS, Adobe Creative Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Developed an animated informational UI using <b>React Move</b>{" "}
                  for the Committee for Children, supporting education of
                  millions of children across 70 countries.
                </li>
                <li ref={addToRefs}>
                  Built a law enforcement employment application tracking system
                  leveraging Angular and <b>Elasticsearch</b>, consuming{" "}
                  <b>GraphQL</b> for efficient backend integration.
                </li>
                <li ref={addToRefs}>
                  Created and deployed an admin interface for a Spokane
                  construction company website using <b>Craft CMS</b>.
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
              <RawImg
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
                  Interactive / Web UI Developer
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2018 - 2019 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Delivered interactive and responsive websites for Fortune 500
                companies in the technology and entertainment industries.
                Focused on performance, interactivity, accessibility, and
                repeatable delivery under tight deadlines.
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
                  and consistent user experience across all devices.
                </li>

                <li ref={addToRefs}>
                  Designed and implemented logic for interactive activities like
                  site-wide scavenger hunts and wallpaper creators for
                  responsive websites supporting a major game publisher&apos;s
                  launches.
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
                  development with designers, developers, and animators, keeping
                  delivery aligned through Trello-managed workflows.
                </li>
                <li ref={addToRefs}>
                  Implemented <b>localization</b> strategies to optimize
                  international deployments, addressing unique design and
                  content challenges across regions.
                </li>
                <li ref={addToRefs}>
                  Integrated with a proprietary (NDA) API for managing user
                  statuses and rewards systems.
                </li>
                <li ref={addToRefs}>
                  Built a zero-dependency, <b>vanilla JavaScript</b> carousel
                  and other components for Comics Kingdom, enabling easy
                  embedding by local newspaper websites.
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
              <RawImg
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
                tight deadlines with rapid learning and high execution quality.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> Angular 4-6, TypeScript, Mapbox,
                Rest APIs, GraphQL, Data Visualizations, Adobe Creative Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Consumed an HTTP search API utilizing a custom domain-specific
                  query language embedded in URL parameters, supporting logical
                  operators, field-based queries, and similarity matching for
                  ChalkLabs&apos; flagship data visualization software,
                  Pushgraph
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
                  Quickly ramped up on Angular and TypeScript, progressing from
                  initial training to production-ready delivery under heavy
                  development demands.
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
                  Worked over 320 hours in June 2017 with a supervisor to meet a
                  critical $5M contract deadline, ensuring the company&apos;s
                  viability.
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <RawImg
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
                shaping technical direction.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> ActionScript 3, ActionScript 2,
                JavaScript, jQuery, Require/AMD, Haxe, Flash, Adobe Creative
                Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Ramped up on <b>AS2</b>, <b>AS3</b>, and <b>Haxe</b>, applying
                  their patterns and frameworks to deliver hundreds of diverse
                  interactive experiences.
                </li>
                <li ref={addToRefs}>
                  Engineered flexible templates and frameworks in AS3, used by
                  teams of developers and animators to collaboratively build
                  games and interactive content.
                </li>
                <li ref={addToRefs}>
                  Served as the lead developer for several first iterations of
                  AT&amp;T&apos;s projects, including their data usage
                  calculators and first-ever app store, authored in vanilla
                  JavaScript and Require/AMD.
                </li>
                <li ref={addToRefs}>
                  Led Seven2&apos;s first Nickelodeon Group project: Blue&apos;s
                  Clues — Mix &apos;N Match Dressup, built in
                  Flash/ActionScript.
                </li>
                <li ref={addToRefs}>
                  Rescued a high-visibility AT&T project by creating a
                  video-based workaround for an incorrectly scoped JavaScript
                  feature, achieving over 90 million interactions in one week.
                </li>
                <li ref={addToRefs}>
                  Developed custom audio and video players for MTV&apos;s
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
                  cross-platform game UI framework.
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
                  Worked 320+ hours in June 2014 to meet a critical deadline for
                  our WildBrain client, in addition to many other high-intensity
                  delivery cycles.
                </li>
                <li ref={addToRefs}>
                  Led development of a <b>Webby Award</b>-winning project (2008
                  People&apos;s Choice Art Website of the Year).
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <RawImg
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
                  Designer / Web UI Developer
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2005 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Designed and developed websites and applications for local
                businesses with C#/.NET backends, establishing online presences
                for clients while working within resource constraints.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> HTML, CSS, Vanilla JavaScript,
                Visual Studio, AJAX, Dynamic HTML, and Adobe Creative Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Served as the sole designer, crafting the look, feel, and
                  branding for businesses entering the online space for the
                  first time.
                </li>
                <li ref={addToRefs}>
                  Designed and developed SCW&apos;s reusable <b>e-commerce</b>
                  /shopping cart platform, which was ahead of its time,
                  preceding modern solutions like Shopify.
                </li>
                <li ref={addToRefs}>
                  Delivered major site revisions under 50% of the allocated
                  budget on one particular project.
                </li>
                <li ref={addToRefs}>
                  Created innovative shortcuts and development tricks leveraging
                  extensive knowledge of DHTML, introducing new approaches to
                  the team.
                </li>
                <li ref={addToRefs}>
                  Delivered strong design outcomes despite limited budgets and
                  constraints (e.g., minimal stock photography and typography
                  options).
                </li>
              </ul>
            </div>
          </div>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

          <div className={rowClass}>
            <div className={divClassLt}>
              <RawImg
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
                  Designer / Web UI Developer
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2003 - 2005 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Designed and developed interactive websites for Spokane-area
                businesses while attending web design school at SFCC.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> XML, XSL, Vanilla JavaScript,
                Dynamic HTML, PHP
              </p>

              <ul>
                <li ref={addToRefs}>
                  Conceptualized creative UI and navigation patterns for a range
                  of Spokane-area business websites.
                </li>
                <li ref={addToRefs}>
                  Redesigned and implemented dynamic, multi-level navigation for
                  The Heart Institute of Spokane.
                </li>
                <li ref={addToRefs}>
                  Utilized XML and XSL in a simple, effective CMS-like approach
                  for retailing fitness equipment.
                </li>
                <li ref={addToRefs}>
                  Shipped client work that met program criteria and earned
                  credit toward the school curriculum.
                </li>
                <li ref={addToRefs}>
                  In the program I started out ahead of all the other students,
                  having prior experience in Photoshop, HTML, JavaScript and
                  art. I unofficially tutored other students whenever I was in
                  the lab and received recognition from faculty for my technical
                  skills.
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
              <RawImg
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
                Recognized with multiple first-place awards; select work was
                published officially by the college.
              </p>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Early Development Journey</h4>

          <div className={rowClass}>
            <div className={divClassLt}>
              <RawImg
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
                Dynamic HTML, PHP, and Adobe Creative Suite
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
          <h4 ref={addToRefs}>Technical Skills</h4>

          <div className={rowClass}>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Front End UI</h5>
              <p>
                <InlineListItem>TypeScript</InlineListItem>
                <InlineListItem>ES6</InlineListItem>
                <InlineListItem>Vanilla JavaScript</InlineListItem>
                <InlineListItem>JSX</InlineListItem>
                <InlineListItem>HTML5</InlineListItem>
                <InlineListItem>CSS3</InlineListItem>
                <InlineListItem>SASS / SCSS</InlineListItem>
                <InlineListItem>Flexbox</InlineListItem>
                <InlineListItem>Grid</InlineListItem>
                <InlineListItem>React</InlineListItem>
                <InlineListItem>Next.js</InlineListItem>
                <InlineListItem>Angular</InlineListItem>
                <InlineListItem>RxJS</InlineListItem>
                <InlineListItem>Redux Toolkit</InlineListItem>
                <InlineListItem>SVG</InlineListItem>
                <InlineListItem>Canvas</InlineListItem>
                <InlineListItem>PixiJS</InlineListItem>
                <InlineListItem>GreenSock / GSAP</InlineListItem>
                <InlineListItem>Bootstrap</InlineListItem>
                <InlineListItem>Mapbox</InlineListItem>
                <InlineListItem>jQuery (legacy)</InlineListItem>
                <InlineListItem>Haxe (legacy)</InlineListItem>
                <InlineListItem>ActionScript 3 (legacy)</InlineListItem>
                <InlineListItem>ActionScript 2 (legacy)</InlineListItem>
                <InlineListItem>Flambé / 2DKit (legacy)</InlineListItem>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Architecture & Practices</h5>
              <p>
                <InlineListItem>SPAs</InlineListItem>
                <InlineListItem>Monorepo Architecture</InlineListItem>
                <InlineListItem>Design Patterns</InlineListItem>
                <InlineListItem>Next.js App Router</InlineListItem>
                <InlineListItem>SSR</InlineListItem>
                <InlineListItem>SSG</InlineListItem>
                <InlineListItem>OOP</InlineListItem>
                <InlineListItem>Functional Programming</InlineListItem>
                <InlineListItem>MVC</InlineListItem>
                <InlineListItem>Accessibility</InlineListItem>
                <InlineListItem>SEO</InlineListItem>
                <InlineListItem>Quality Assurance</InlineListItem>
                <InlineListItem>E2E Testing</InlineListItem>
                <InlineListItem>Tracking / Analytics</InlineListItem>
                <InlineListItem>Image Processing</InlineListItem>
                <InlineListItem>Tween Engines</InlineListItem>
                <InlineListItem>Headless CMS</InlineListItem>
                <InlineListItem>DHTML (legacy)</InlineListItem>
                <InlineListItem>Game UI Frameworks (legacy)</InlineListItem>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Tooling & Workflow</h5>
              <p>
                <InlineListItem>Node.js</InlineListItem>
                <InlineListItem>NPM</InlineListItem>
                <InlineListItem>Vite</InlineListItem>
                <InlineListItem>Webpack</InlineListItem>
                <InlineListItem>Babel</InlineListItem>
                <InlineListItem>ESLint</InlineListItem>
                <InlineListItem>Prettier</InlineListItem>
                <InlineListItem>Vitest</InlineListItem>
                <InlineListItem>GitHub Actions</InlineListItem>
                <InlineListItem>VSCode</InlineListItem>
                <InlineListItem>Sublime Text</InlineListItem>
                <InlineListItem>Visual Studio</InlineListItem>
                <InlineListItem>Git</InlineListItem>
                <InlineListItem>Git Tower</InlineListItem>
                <InlineListItem>Sourcetree</InlineListItem>
                <InlineListItem>Sauce Labs</InlineListItem>
                <InlineListItem>BrowserStack</InlineListItem>
                <InlineListItem>Jira</InlineListItem>
                <InlineListItem>Confluence</InlineListItem>
                <InlineListItem>Trello</InlineListItem>
                <InlineListItem>Smartsheet</InlineListItem>
                <InlineListItem>Google Docs</InlineListItem>
                <InlineListItem>Illustrator</InlineListItem>
                <InlineListItem>Photoshop</InlineListItem>
                <InlineListItem>
                  Animate (w/ scripting &amp; HTML5 export)
                </InlineListItem>
                <InlineListItem>ChatGPT</InlineListItem>
                <InlineListItem>Copilot AI</InlineListItem>
                <InlineListItem>Perplexity AI</InlineListItem>
                <InlineListItem>Grunt (legacy)</InlineListItem>
                <InlineListItem>Gulp (legacy)</InlineListItem>
                <InlineListItem>Create / Easel (legacy)</InlineListItem>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>APIs & Integration</h5>
              <p>
                <InlineListItem>REST APIs</InlineListItem>
                <InlineListItem>GraphQL</InlineListItem>
                <InlineListItem>Express</InlineListItem>
                <InlineListItem>JWT</InlineListItem>
                <InlineListItem>JSON</InlineListItem>
                <InlineListItem>XML</InlineListItem>
                <InlineListItem>XSL</InlineListItem>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>CMS & Enterprise</h5>
              <p>
                <InlineListItem>Payload CMS</InlineListItem>
                <InlineListItem>Craft CMS</InlineListItem>
                <InlineListItem>Salesforce</InlineListItem>
                <InlineListItem>OneTrust</InlineListItem>
                <InlineListItem>Litmus</InlineListItem>
                <InlineListItem>FreeMarker</InlineListItem>
                <InlineListItem>Mustache / Handlebars</InlineListItem>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Cloud & Data</h5>
              <p>
                <InlineListItem>AWS</InlineListItem>
                <InlineListItem>AWS S3</InlineListItem>
                <InlineListItem>AWS SES</InlineListItem>
                <InlineListItem>AWS ECR</InlineListItem>
                <InlineListItem>CloudWatch</InlineListItem>
                <InlineListItem>CloudWatch RUM</InlineListItem>
                <InlineListItem>MongoDB</InlineListItem>
                <InlineListItem>Elasticsearch</InlineListItem>
                <InlineListItem>Docker</InlineListItem>
                <InlineListItem>Docker Compose</InlineListItem>
                <InlineListItem>Terraform</InlineListItem>
                <InlineListItem>Caddy</InlineListItem>
                <InlineListItem>VirtualBox</InlineListItem>
                <InlineListItem>Infrastructure as Code</InlineListItem>
                <InlineListItem>Cloud Computing</InlineListItem>
                <InlineListItem>Container Orchestration</InlineListItem>
              </p>
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
                  <div className={clsx(styles.badges, "col-xs-12")}>
                    {Array.from({ length: 14 }, (_, index) => (
                      <React.Fragment key={index}>
                        <RawImg src="/images/cv/gold-badge.svg" alt="" />
                      </React.Fragment>
                    ))}{" "}
                  </div>
                </div>
              </div>
              <div className={clsx(styles.desc, "col-xs-12")}>
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

              <div className={clsx(styles.desc, "col-xs-12")}>
                People&apos;s Choice — Art Website of the Year — Artocracy.org
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

              <div className={clsx(styles.desc, "col-xs-12")}>
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
              <p>
                <InlineListItem>Escape Games</InlineListItem>
                <InlineListItem>Shooter Games</InlineListItem>
                <InlineListItem>Platformer Games</InlineListItem>
                <InlineListItem>Puzzle Games</InlineListItem>
                <InlineListItem>Edutainment Games</InlineListItem>
                <InlineListItem>Skill Games</InlineListItem>
                <InlineListItem>Tactical Movement Games</InlineListItem>
                <InlineListItem>Character Customization Games</InlineListItem>
                <InlineListItem>Magnetic Poetry Games</InlineListItem>
                <InlineListItem>Drawing Utilities</InlineListItem>
                <InlineListItem>Wallpaper Generators</InlineListItem>
                <InlineListItem>Audio Players</InlineListItem>
                <InlineListItem>Video Players</InlineListItem>
                <InlineListItem>360° Video Players</InlineListItem>
                <InlineListItem>Animated E-Cards</InlineListItem>
                <InlineListItem>Screensavers</InlineListItem>
                <InlineListItem>Quizzes</InlineListItem>
                <InlineListItem>Surveys and Forms</InlineListItem>
                <InlineListItem>Sweepstakes Activities</InlineListItem>
                <InlineListItem>Photo Upload Personalization</InlineListItem>
                <InlineListItem>Drag-and-Drop Builders</InlineListItem>
                <InlineListItem>Interactive Tutorials</InlineListItem>
                <InlineListItem>Virtual Tours</InlineListItem>
                <InlineListItem>Call-a-Friend Message Builders</InlineListItem>
                <InlineListItem>Movie/TV Show Tie-Ins</InlineListItem>
                <InlineListItem>Site Release Reveals</InlineListItem>
                <InlineListItem>Media/Timeline Sequencers</InlineListItem>
                <InlineListItem>Interactive Slideshows</InlineListItem>
                <InlineListItem>
                  Configurable Sprite Sheet Player
                </InlineListItem>
                <InlineListItem>Synced Banner Advertising</InlineListItem>
                <InlineListItem>Microsites</InlineListItem>
                <InlineListItem>Product Demos</InlineListItem>
                <InlineListItem>Product Catalogs</InlineListItem>
                <InlineListItem>App Store</InlineListItem>
                <InlineListItem>Custom Navigation Menus</InlineListItem>
                <InlineListItem>Custom Scrollbars</InlineListItem>
                <InlineListItem>Custom Tween Engine</InlineListItem>
                <InlineListItem>Data Usage Calculators</InlineListItem>
                <InlineListItem>Data Science Application</InlineListItem>
                <InlineListItem>Interactive Portfolio</InlineListItem>
                <InlineListItem>Informational Presentations</InlineListItem>
                <InlineListItem>HTML Emails</InlineListItem>
                <InlineListItem>Email Consent Workflows</InlineListItem>
              </p>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Brands</h4>

          <div className={rowClass}>
            <div className={divClassLt}></div>

            <div ref={addToRefs} className={divClassRt}>
              <p>
                <InlineListItem>Nickelodeon</InlineListItem>
                <InlineListItem>Nick Jr.</InlineListItem>
                <InlineListItem>NDA brand</InlineListItem>
                <InlineListItem>Disney</InlineListItem>
                <InlineListItem>Mattel</InlineListItem>
                <InlineListItem>AT&amp;T</InlineListItem>
                <InlineListItem>MTV</InlineListItem>
                <InlineListItem>Netflix</InlineListItem>
                <InlineListItem>National Geographic</InlineListItem>
                <InlineListItem>USDA</InlineListItem>
                <InlineListItem>EPA</InlineListItem>
                <InlineListItem>NIFA</InlineListItem>
                <InlineListItem>Expedia</InlineListItem>
                <InlineListItem>New Line Cinema</InlineListItem>
                <InlineListItem>The Weinstein Company</InlineListItem>
                <InlineListItem>Addicting Games</InlineListItem>
                <InlineListItem>The N</InlineListItem>
                <InlineListItem>T-Mobile</InlineListItem>
                <InlineListItem>Premera Blue Cross</InlineListItem>
                <InlineListItem>Bravo</InlineListItem>
                <InlineListItem>Earthbound Farms</InlineListItem>
                <InlineListItem>Cingular</InlineListItem>
                <InlineListItem>HTC</InlineListItem>
                <InlineListItem>OnSet Productions</InlineListItem>
                <InlineListItem>Ronix Wakeboards</InlineListItem>
                <InlineListItem>RedHook Brewing</InlineListItem>
                <InlineListItem>Stoli Vodka</InlineListItem>
                <InlineListItem>Tanteo Tequila</InlineListItem>
                <InlineListItem>Tobacco Smokes You</InlineListItem>
                <InlineListItem>UBS Financial Services</InlineListItem>
                <InlineListItem>XM Radio</InlineListItem>
                <InlineListItem>Lincoln Mercury</InlineListItem>
                <InlineListItem>Dannon</InlineListItem>
                <InlineListItem>Yoplait</InlineListItem>
                <InlineListItem>Post</InlineListItem>
                <InlineListItem>WildBrain</InlineListItem>
                <InlineListItem>Yesmail</InlineListItem>
                <InlineListItem>Novo Nordisk</InlineListItem>
                <InlineListItem>Takeda Pharmaceuticals</InlineListItem>
                <InlineListItem>Citibank</InlineListItem>
                <InlineListItem>Golden 1 Credit Union</InlineListItem>
                <InlineListItem>Avista Utilities</InlineListItem>
                <InlineListItem>Committee for Children</InlineListItem>
                <InlineListItem>The Heart Institute of Spokane</InlineListItem>
                <InlineListItem>AbbVie Pharmaceuticals</InlineListItem>
                <InlineListItem>Exact Sciences</InlineListItem>
                <InlineListItem>Comics Kingdom</InlineListItem>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CurriculumVitae;
