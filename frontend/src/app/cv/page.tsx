"use client";

import clsx from "clsx";
import React from "react";

import { RawImg } from "@/components/common/RawImg";
import HeaderSub from "@/components/layout/HeaderSub";
import useInViewAnimation from "@/hooks/useInViewAnimation";

import styles from "./CvPage.module.scss";

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
                  Front-end / UI developer specializing in interaction-driven,
                  visually polished, performance-sensitive interfaces.
                </strong>
              </p>

              <p>
                Experienced building production UI for enterprise and consumer
                products. Strong in <strong>HTML, CSS, and JavaScript</strong>,
                with modern framework experience including{" "}
                <strong>React</strong>, <strong>TypeScript</strong>,{" "}
                <strong>Next.js</strong>, and <strong>Angular</strong>, as well
                as extensive experience with DOM manipulation, jQuery, and
                vanilla JavaScript.
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
                  Animation & UI Design: Evolved from award-winning Flash/AS3
                  motion work into modern CSS/JS animation systems
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
                <div className={styles.rightSub}>[ 09.2024 - 2026 ]</div>
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
                <li ref={addToRefs}>
                  Implemented Angular routing with guards, resolvers, and
                  URL-driven state to support deep-linked views.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Experience</h4>

          {/*-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --*/}

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
                <div className={styles.rightSub}>[ 05.2021 - 09.2024 ]</div>
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
                alt="BB Logo"
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
                  Front-end / UI Developer
                  <div className={styles.parenthetical}>
                    [Independent Contractor]
                  </div>
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>
                  [ 04.2020 - 05.2021 ]
                </div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Built interactive, responsive web experiences for a
                pharmaceutical startup and local businesses.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope: </span>TypeScript, React, Next.js,
                Angular, Wordpress, jQuery, AWS, SVG, Canvas, Elasticsearch,
                Craft CMS, Adobe Creative Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Built and maintained Angular features using a component-driven
                  approach (reusable UI components, shared modules, and
                  consistent SCSS theming).
                </li>
                <li ref={addToRefs}>
                  Implemented reactive forms with custom validators, error
                  states, and accessible form patterns.
                </li>
                <li ref={addToRefs}>
                  Authored Angular services and RxJS pipelines for API
                  integration, caching, and resilient request handling.
                </li>
                <li ref={addToRefs}>
                  Integrated routing patterns including route guards, resolvers,
                  and URL-driven UI state for deep-linkable experiences.
                </li>

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
                <div className={styles.rightSub}>
                  [ 10.2005 - 04.2016; 06.2018 - 09.2019 ]
                </div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Delivered interactive and responsive websites for Fortune 500
                companies in the technology and entertainment industries.
                Focused on performance, interactivity, accessibility, and
                repeatable delivery under tight deadlines.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> Angular, TypeScript, RxJS, jQuery,
                vanilla JavaScript, Craft CMS, Grunt/Gulp, CreateJS, Adobe
                Creative Suite, ActionScript 3, ActionScript 2, Require/AMD,
                Haxe, Flash
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
                  Delivered under extremely tight deadlines, often starting
                  development before client design approvals to meet launch
                  dates.
                </li>
                {/* earlier/later */}
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
                <div className={styles.rightSub}>[ 01.2017 - 06.2018 ]</div>
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
                <div className={styles.rightSub}>[ 06.2005 - 10.2005 ]</div>
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
                <div className={styles.rightSub}>[ 09.2003 - 06.2005 ]</div>
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
                <div className={styles.rightSub}>[ 09.2003 - 06.2005 ]</div>
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
              <p className={styles.inlineList}>
                <span>TypeScript</span>
                <span>ES6</span>
                <span>Vanilla JavaScript</span>
                <span>JSX</span>
                <span>HTML5</span>
                <span>CSS3</span>
                <span>SASS / SCSS</span>
                <span>Flexbox</span>
                <span>Grid</span>
                <span>React</span>
                <span>Next.js</span>
                <span>Angular</span>
                <span>RxJS</span>
                <span>Redux Toolkit</span>
                <span>SVG</span>
                <span>Canvas</span>
                <span>PixiJS</span>
                <span>GreenSock / GSAP</span>
                <span>Bootstrap</span>
                <span>Mapbox</span>
                <span>jQuery (previous)</span>
                <span>Haxe (previous)</span>
                <span>ActionScript 3 (previous)</span>
                <span>ActionScript 2 (previous)</span>
                <span>Flambé / 2DKit (previous)</span>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Architecture & Practices</h5>
              <p className={styles.inlineList}>
                <span>SPAs</span>
                <span>Monorepo Architecture</span>
                <span>Design Patterns</span>
                <span>Next.js App Router</span>
                <span>SSR</span>
                <span>SSG</span>
                <span>OOP</span>
                <span>Functional Programming</span>
                <span>MVC</span>
                <span>Accessibility</span>
                <span>SEO</span>
                <span>Quality Assurance</span>
                <span>E2E Testing</span>
                <span>Tracking / Analytics</span>
                <span>Image Processing</span>
                <span>Tween Engines</span>
                <span>Headless CMS</span>
                <span>DHTML (previous)</span>
                <span>Game UI Frameworks (previous)</span>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Tooling & Workflow</h5>
              <p className={styles.inlineList}>
                <span>Node.js</span>
                <span>NPM</span>
                <span>Vite</span>
                <span>Webpack</span>
                <span>Babel</span>
                <span>ESLint</span>
                <span>Prettier</span>
                <span>Vitest</span>
                <span>GitHub Actions</span>
                <span>VSCode</span>
                <span>Sublime Text</span>
                <span>Visual Studio</span>
                <span>Git</span>
                <span>Git Tower</span>
                <span>Sourcetree</span>
                <span>Sauce Labs</span>
                <span>BrowserStack</span>
                <span>Jira</span>
                <span>Confluence</span>
                <span>Trello</span>
                <span>Smartsheet</span>
                <span>Google Docs</span>
                <span>Illustrator</span>
                <span>Photoshop</span>
                <span>Animate (w/ scripting &amp; HTML5 export)</span>
                <span>ChatGPT</span>
                <span>Copilot AI</span>
                <span>Perplexity AI</span>
                <span>Grunt (previous)</span>
                <span>Gulp (previous)</span>
                <span>Create / Easel (previous)</span>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>APIs & Integration</h5>
              <p className={styles.inlineList}>
                <span>REST APIs</span>
                <span>GraphQL</span>
                <span>Express</span>
                <span>JWT</span>
                <span>JSON</span>
                <span>XML</span>
                <span>XSL</span>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>CMS & Enterprise</h5>
              <p className={styles.inlineList}>
                <span>Payload CMS</span>
                <span>Craft CMS</span>
                <span>Salesforce</span>
                <span>OneTrust</span>
                <span>Litmus</span>
                <span>FreeMarker</span>
                <span>Mustache / Handlebars</span>
              </p>
            </div>
            <div ref={addToRefs} className={divClassLt}></div>
            <div ref={addToRefs} className={divClassRt}>
              <h5>Cloud & Data</h5>
              <p className={styles.inlineList}>
                <span>AWS</span>
                <span>AWS S3</span>
                <span>AWS SES</span>
                <span>AWS ECR</span>
                <span>CloudWatch</span>
                <span>CloudWatch RUM</span>
                <span>MongoDB</span>
                <span>Elasticsearch</span>
                <span>Docker</span>
                <span>Docker Compose</span>
                <span>Terraform</span>
                <span>Caddy</span>
                <span>VirtualBox</span>
                <span>Infrastructure as Code</span>
                <span>Cloud Computing</span>
                <span>Container Orchestration</span>
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
              <p className={styles.inlineList}>
                <span>Escape Games</span>
                <span>Shooter Games</span>
                <span>Platformer Games</span>
                <span>Puzzle Games</span>
                <span>Edutainment Games</span>
                <span>Skill Games</span>
                <span>Tactical Movement Games</span>
                <span>Character Customization Games</span>
                <span>Magnetic Poetry Games</span>
                <span>Drawing Utilities</span>
                <span>Wallpaper Generators</span>
                <span>Audio Players</span>
                <span>Video Players</span>
                <span>360° Video Players</span>
                <span>Animated E-Cards</span>
                <span>Screensavers</span>
                <span>Quizzes</span>
                <span>Surveys and Forms</span>
                <span>Sweepstakes Activities</span>
                <span>Photo Upload Personalization</span>
                <span>Drag-and-Drop Builders</span>
                <span>Interactive Tutorials</span>
                <span>Virtual Tours</span>
                <span>Call-a-Friend Message Builders</span>
                <span>Movie/TV Show Tie-Ins</span>
                <span>Site Release Reveals</span>
                <span>Media/Timeline Sequencers</span>
                <span>Interactive Slideshows</span>
                <span>Configurable Sprite Sheet Player</span>
                <span>Synced Banner Advertising</span>
                <span>Microsites</span>
                <span>Product Demos</span>
                <span>Product Catalogs</span>
                <span>App Store</span>
                <span>Custom Navigation Menus</span>
                <span>Custom Scrollbars</span>
                <span>Custom Tween Engine</span>
                <span>Data Usage Calculators</span>
                <span>Data Science Application</span>
                <span>Interactive Portfolio</span>
                <span>Informational Presentations</span>
                <span>HTML Emails</span>
                <span>Email Consent Workflows</span>
              </p>
            </div>
          </div>
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Brands</h4>

          <div className={rowClass}>
            <div className={divClassLt}></div>

            <div ref={addToRefs} className={divClassRt}>
              <p className={styles.inlineList}>
                <span>Nickelodeon</span>
                <span>Nick Jr.</span>
                <span>NDA brand</span>
                <span>Disney</span>
                <span>Mattel</span>
                <span>AT&amp;T</span>
                <span>MTV</span>
                <span>Netflix</span>
                <span>National Geographic</span>
                <span>USDA</span>
                <span>EPA</span>
                <span>NIFA</span>
                <span>Expedia</span>
                <span>New Line Cinema</span>
                <span>The Weinstein Company</span>
                <span>Addicting Games</span>
                <span>The N</span>
                <span>T-Mobile</span>
                <span>Premera Blue Cross</span>
                <span>Bravo</span>
                <span>Earthbound Farms</span>
                <span>Cingular</span>
                <span>HTC</span>
                <span>OnSet Productions</span>
                <span>Ronix Wakeboards</span>
                <span>RedHook Brewing</span>
                <span>Stoli Vodka</span>
                <span>Tanteo Tequila</span>
                <span>Tobacco Smokes You</span>
                <span>UBS Financial Services</span>
                <span>XM Radio</span>
                <span>Lincoln Mercury</span>
                <span>Dannon</span>
                <span>Yoplait</span>
                <span>Post</span>
                <span>WildBrain</span>
                <span>Yesmail</span>
                <span>Novo Nordisk</span>
                <span>Takeda Pharmaceuticals</span>
                <span>Citibank</span>
                <span>Golden 1 Credit Union</span>
                <span>Avista Utilities</span>
                <span>Committee for Children</span>
                <span>The Heart Institute of Spokane</span>
                <span>AbbVie Pharmaceuticals</span>
                <span>Exact Sciences</span>
                <span>Comics Kingdom</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CurriculumVitae;
