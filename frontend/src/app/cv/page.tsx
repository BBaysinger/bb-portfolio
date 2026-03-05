"use client";

import clsx from "clsx";
import React from "react";

import { RawImg } from "@/components/common/RawImg";
import ExperienceItem, {
  type CvExperienceItemData,
} from "@/components/cv/ExperienceItem";
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

  const [cvExperienceItems, setCvExperienceItems] = React.useState<
    CvExperienceItemData[]
  >([]);
  const [recentIndependentStudyItems, setRecentIndependentStudyItems] =
    React.useState<CvExperienceItemData[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    const fetchCvExperience = async () => {
      try {
        const response = await fetch("/api/cv-experience/", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as {
          success?: boolean;
          data?: {
            experienceItems?: CvExperienceItemData[];
            recentIndependentStudyItems?: CvExperienceItemData[];
          };
        };

        if (!payload.success || cancelled) return;

        setCvExperienceItems(
          Array.isArray(payload.data?.experienceItems)
            ? payload.data.experienceItems
            : [],
        );

        setRecentIndependentStudyItems(
          Array.isArray(payload.data?.recentIndependentStudyItems)
            ? payload.data.recentIndependentStudyItems
            : [],
        );
      } catch {
        // Keep the section empty when the CMS endpoint is unavailable.
      }
    };

    void fetchCvExperience();

    return () => {
      cancelled = true;
    };
  }, []);

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
                Experienced building production UI for enterprise clients and
                consumer-facing web applications. Strong in{" "}
                <strong>HTML, CSS, and JavaScript</strong>, with modern
                framework experience including <strong>React</strong>,{" "}
                <strong>TypeScript</strong>, <strong>Next.js</strong>, and{" "}
                <strong>Angular</strong>, as well as extensive experience with
                DOM manipulation, jQuery, and vanilla JavaScript.
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
                  React (2 years): Component-driven UI, hooks, routing, and
                  state management with Redux
                </li>
                <li>
                  Angular (2 years): Enterprise component architecture, RxJS,
                  and SCSS-based theming
                </li>
                <li>
                  TypeScript (3 years): Client-side application development,
                  component architecture, and maintainable typed UI code, with
                  many years of prior experience in strongly typed languages
                  (Haxe/AS3)
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
          <h4 ref={addToRefs}>Independent R&D and Contracting</h4>
          {recentIndependentStudyItems.map((item, index) => (
            <ExperienceItem
              key={`${item.company}-${item.date}-${index}`}
              item={item}
              addToRefs={addToRefs}
            />
          ))}
        </div>

        <div className={"container"}>
          <h4 ref={addToRefs}>Experience</h4>

          {cvExperienceItems.map((item) => (
            <ExperienceItem
              key={`${item.company}-${item.date}`}
              item={item}
              addToRefs={addToRefs}
            />
          ))}
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
                    Independent Developer
                    <span className={styles.location}> — Spokane, WA</span>
                  </h5>
                  Early Interactive Web Focus
                </div>
                <div className={styles.break}></div>
                <div className={styles.rightSub}>[ 2001 - 2003 ]</div>
              </div>

              <p ref={addToRefs} className={styles.desc}>
                Built foundational skills in graphics tooling and early
                cross-platform interactive JavaScript development before formal
                design training. Experience with vanilla JavaScript began during
                this period.
              </p>

              <p ref={addToRefs} className={styles.scope}>
                <span>Technical Scope:</span> Vanilla JavaScript, HTML, CSS,
                Dynamic HTML, PHP, and Adobe Creative Suite
              </p>

              <ul>
                <li ref={addToRefs}>
                  Built practical skills in{" "}
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
                <span>jQuery (legacy)</span>
                <span>Haxe</span>
                <span>ActionScript 3 (legacy)</span>
                <span>ActionScript 2 (legacy)</span>
                <span>Flambé / 2DKit (legacy)</span>
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
                <span>DHTML (legacy)</span>
                <span>Game UI Frameworks (legacy)</span>
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
                <span>Grunt (legacy)</span>
                <span>Gulp (legacy)</span>
                <span>Create / Easel (legacy)</span>
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
                <span>Service Orchestration &amp; Deployment Automation</span>
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
                Contributed to 13 projects that received awards in the annual
                Spokane Ad Fed (Addy) Awards, including five Silver, four Gold,
                two Best of Division, one Best of Show, and one Golden Pixel
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
                <span>Pushgraph Data Visualization Platform</span>
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
                <span>Major Gaming Company (NDA)</span>
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
