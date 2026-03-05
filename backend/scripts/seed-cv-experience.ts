#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import dotenv from 'dotenv'
import { getPayload, type Payload } from 'payload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envProfileArgIndex = process.argv.indexOf('--env')
const envProfile =
  (envProfileArgIndex !== -1 ? process.argv[envProfileArgIndex + 1] : process.env.ENV_PROFILE) ||
  'local'

process.env.ENV_PROFILE = String(envProfile)

const dotenvProfilePath = path.resolve(__dirname, `../.env.${envProfile}`)
if (fs.existsSync(dotenvProfilePath)) {
  dotenv.config({ path: dotenvProfilePath })
}

const dotenvPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(dotenvPath)) {
  dotenv.config({ path: dotenvPath })
}

type SeedExperience = {
  logoFilename: string
  logoUrl: string
  logoAlt: string
  company: string
  location: string
  title: string
  description: string
  technicalScope: string
  date: string
  bulletPoints: string[]
}

const experienceSeed: SeedExperience[] = [
  {
    logoFilename: 'epsilon.svg',
    logoUrl: '/images/cv/epsilon.svg',
    logoAlt: 'Epsilon Logo',
    company: 'Epsilon',
    location: 'Irving, TX | Remote | W2',
    title: 'Front-end Developer',
    description:
      'Built interactive, responsive web experiences for Fortune 500 clients across banking, pharmaceuticals, and entertainment.',
    technicalScope:
      'Figma, ES6, TypeScript, jQuery, Adobe Suite, Sitecore, HTML Email, Salesforce, OneTrust, FreeMarker',
    date: '05.2021 - 09.2024',
    bulletPoints: [
      'Implemented dynamic UI components, validated forms, data-driven informational grids, global navigation, and collapsible menus for the Golden 1 Credit Union website, integrating jQuery with Sitecore.',
      'Built and maintained reusable email components in Salesforce Marketing Cloud; standardized production with preprocessing to improve consistency and throughput.',
      'Hardened email rendering via Litmus testing across clients/devices (including dark mode and @2x assets), improving deliverability and consistency.',
      'Created an Oncology Report Explorer for the Exact Sciences website, helping users understand diagnostic results documents. Converted Figma designs into responsive and interactive web pages and components, ensuring pixel-perfect implementation and seamless user experience across all devices.',
      'Developed consent management workflows using Apache FreeMarker for OneTrust integration, facilitating efficient data exchange across platforms like MuleSoft and Veeva, enhancing compliance and user experience through event-driven and scheduled processes.',
      'Implemented OneTrust preference centers to manage user consent, data privacy preferences, and regulatory compliance (GDPR, CCPA) across multiple platforms.',
    ],
  },
  {
    logoFilename: 'bb.svg',
    logoUrl: '/images/cv/bb.svg',
    logoAlt: 'BB Logo',
    company: 'BB Interactive',
    location: 'Spokane, WA | Remote',
    title: 'Front-end / UI Developer [Independent Contractor]',
    description:
      'Built interactive, responsive web experiences for Avalere Health (formerly CloserLook), Meda Systems, and local businesses.',
    technicalScope:
      'TypeScript, Angular, jQuery, SVG, Canvas, Elasticsearch, Craft CMS, Figma, Creative Suite',
    date: '04.2020 - 05.2021',
    bulletPoints: [
      'Built and maintained Angular features using a component-driven approach (reusable UI components, shared modules, and consistent SCSS theming).',
      'Implemented reactive forms with custom validators, error states, and accessible form patterns.',
      'Authored Angular services and RxJS pipelines for API integration, caching, and resilient request handling.',
      'Integrated routing patterns including route guards, resolvers, and URL-driven UI state for deep-linkable experiences.',
      'Developed an animated informational UI using React Move for the Committee for Children, supporting education of millions of children across 70 countries.',
      'Built a law enforcement employment application tracking system leveraging Angular and Elasticsearch, consuming GraphQL for efficient backend integration.',
      'Created and deployed an admin interface for a Spokane construction company website using Craft CMS.',
      'Produced animations in vanilla JavaScript and CSS3 for websites and banner ads for Novo Nordisk, enhancing user UI/UX engagement for a multinational pharmaceutical company.',
      'Prototyped a legal investigation application in Angular to process and analyze large volumes of company documents efficiently.',
    ],
  },
  {
    logoFilename: 's2.svg',
    logoUrl: '/images/cv/s2.svg',
    logoAlt: 'Seven2',
    company: 'Seven2 Interactive',
    location: 'Spokane, WA',
    title: 'Interactive / Web UI Developer',
    description:
      'Delivered interactive and responsive websites for large enterprises in the technology and entertainment industries. Focused on performance, interactivity, accessibility, and repeatable delivery under tight deadlines.',
    technicalScope:
      'jQuery, vanilla JavaScript, Craft CMS, Grunt/Gulp, CreateJS, ImpactJS Creative Suite, AS3, AS2, Require/AMD, Haxe, Flash, Trello',
    date: '10.2005 - 04.2016; 06.2018 - 09.2019',
    bulletPoints: [
      'Converted Sketch designs into responsive and interactive web pages and components, ensuring pixel-perfect implementation and consistent user experience across all devices.',
      "Designed and implemented logic for interactive activities like site-wide scavenger hunts and wallpaper creators for responsive websites supporting a major game publisher's launches.",
      'Optimized UI elements for accessibility by applying WCAG best practices for keyboard navigation and screen reader compatibility.',
      'Contributed to the development of single-page applications (SPAs) using TypeScript and Angular 6+, ensuring scalability and modern functionality.',
      'Provided technical oversight and contributed to concept development with designers, developers, and animators, keeping delivery aligned through Trello-managed workflows.',
      'Implemented localization strategies to optimize international deployments, addressing unique design and content challenges across regions.',
      'Delivered under extremely tight deadlines, often starting development before client design approvals to meet launch dates.',
      'Engineered flexible templates and frameworks in AS3, used by teams of developers and animators to collaboratively build games and interactive content.',
      "Served as the lead developer for several first iterations of AT&T's projects, including their data usage calculators and first-ever app store, authored in vanilla JavaScript and Require/AMD.",
      "Led Seven2's first Nickelodeon Group project: Blue's Clues - Mix 'N Match Dressup, built in Flash/ActionScript.",
      'Rescued a high-visibility AT&T project by creating a video-based workaround for an incorrectly scoped JavaScript feature, achieving over 90 million interactions in one week.',
      "Developed custom audio and video players for MTV's high-production websites using AS3.",
      'Designed and implemented a performant physics-based tween engine in AS3, preceding industry-standard systems like Tweener and GSAP.',
      'Contributed a cross-platform mobile accelerometer solution to Flambe (now 2Dkit), a leading HTML5 and cross-platform game UI framework.',
      'Built APIs for managing JSON, XML, and CSV data exchanges, enabling user-driven server/database interactions with zero-dependency JavaScript and AS3 solutions.',
      'Played a critical role in project conceptualization, contributing to multiple award-winning projects at annual Spokane Ad Fed events.',
      'Worked 320+ hours in June 2014 to meet a critical deadline for our WildBrain client, in addition to many other high-intensity delivery cycles.',
      "Led development of a Webby Award-winning project (2008 People's Choice Art Website of the Year).",
    ],
  },
  {
    logoFilename: 'chalklabs.svg',
    logoUrl: '/images/cv/chalklabs.svg',
    logoAlt: 'ChalkLabs Logo',
    company: 'ChalkLabs',
    location: 'Spokane, WA',
    title: 'UI Developer / Designer',
    description:
      'Designed and developed user interfaces for web applications aimed at helping government organizations process, analyze, and visualize data. Contributed to mission-critical projects under tight deadlines with rapid learning and high execution quality.',
    technicalScope:
      'Angular 4-6, TypeScript, Mapbox, REST APIs, GraphQL, Custom Query Language API, Creative Suite, Smartsheet',
    date: '01.2017 - 06.2018',
    bulletPoints: [
      "Consumed an HTTP search API utilizing a custom domain-specific query language embedded in URL parameters, supporting logical operators, field-based queries, and similarity matching for ChalkLabs' flagship data visualization software, Pushgraph.",
      'Independently developed the Pushgraph dashboard drag-and-drop widget framework for end user customization, utilizing Angular component factory methods and local storage.',
      'Designed the entire UI for the new iteration of Pushgraph in under three days with minimal instruction and ramp-up.',
      'Created many widgets for the system including infinite-scrolling data grids and data visualizations using Mapbox, Highcharts, and other visualization libraries.',
      'Quickly ramped up on Angular and TypeScript, progressing from initial training to production-ready delivery under heavy development demands.',
      'Scoped, time-lined, and estimated tasks for sprint management in a Kanban workflow, tracked via Smartsheet.',
      'Consumed REST APIs to manage users, configuration settings, and data processed by the Pushgraph application and other projects.',
      "Worked over 320 hours in June 2017 with a supervisor to meet a critical $5M contract deadline, ensuring the company's viability.",
    ],
  },
  {
    logoFilename: 'scw.svg',
    logoUrl: '/images/cv/scw.svg',
    logoAlt: 'SCW Logo',
    company: 'SCW Consulting',
    location: 'Spokane, WA',
    title: 'Designer / Web UI Developer',
    description:
      'Designed and developed websites and applications for local businesses with C#/.NET backends, establishing online presences for clients while working within resource constraints.',
    technicalScope:
      'HTML, CSS, Vanilla JavaScript, Visual Studio, Dynamic HTML, AJAX, Creative Suite',
    date: '06.2005 - 10.2005',
    bulletPoints: [
      'Served as the sole designer, crafting the look, feel, and branding for businesses entering the online space for the first time.',
      "Designed and developed SCW's reusable e-commerce/shopping cart platform, which was ahead of its time, preceding modern solutions like Shopify.",
      'Delivered major site revisions under 50% of the allocated budget on one particular project.',
      'Created innovative shortcuts and development tricks leveraging extensive knowledge of DHTML, introducing new approaches to the team.',
      'Delivered strong design outcomes despite limited budgets and constraints (e.g., minimal stock photography and typography options).',
    ],
  },
  {
    logoFilename: 'bb.svg',
    logoUrl: '/images/cv/bb.svg',
    logoAlt: 'BB Interactive Logo',
    company: 'Freelance',
    location: 'Spokane, WA',
    title: 'Designer / Web UI Developer',
    description:
      'Designed and developed interactive websites for Spokane-area businesses while attending web design school at SFCC.',
    technicalScope: 'XML, XSL, Vanilla JavaScript, Dynamic HTML, PHP',
    date: '09.2003 - 06.2005',
    bulletPoints: [
      'Conceptualized creative UI and navigation patterns for a range of Spokane-area business websites.',
      'Redesigned and implemented dynamic, multi-level navigation for The Heart Institute of Spokane.',
      'Utilized XML and XSL in a simple, effective CMS-like approach for retailing fitness equipment.',
      'Shipped client work that met program criteria and earned credit toward the school curriculum.',
      'In the program I started out ahead of all the other students, having prior experience in Photoshop, HTML, JavaScript and art. I unofficially tutored other students whenever I was in the lab and received recognition from faculty for my technical skills.',
    ],
  },
]

async function upsertCvLogo(payload: Payload, seed: SeedExperience): Promise<string> {
  const sourceFilePath = path.resolve(
    __dirname,
    `./seed-assets/cv-experience-logos/${seed.logoFilename}`,
  )

  if (!fs.existsSync(sourceFilePath)) {
    throw new Error(`Missing source logo file: ${sourceFilePath}`)
  }

  const existing = await payload.find({
    collection: 'cvExperienceLogos',
    where: {
      filename: { equals: seed.logoFilename },
    },
    limit: 1,
    depth: 0,
  })

  if (existing.docs.length > 0) {
    const existingDoc = existing.docs[0]
    await payload.update({
      collection: 'cvExperienceLogos',
      id: existingDoc.id,
      data: {
        alt: seed.logoAlt,
      },
    })
    return String(existingDoc.id)
  }

  const created = await payload.create({
    collection: 'cvExperienceLogos',
    filePath: sourceFilePath,
    data: {
      alt: seed.logoAlt,
    },
  })

  return String(created.id)
}

async function main() {
  let payload: Payload | null = null

  try {
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })

    const experienceItems = []

    for (const item of experienceSeed) {
      const logoId = await upsertCvLogo(payload, item)

      experienceItems.push({
        blockType: 'experienceItem' as const,
        logo: logoId,
        company: item.company,
        location: item.location,
        title: item.title,
        description: item.description,
        technicalScope: item.technicalScope,
        date: item.date,
        bulletPoints: item.bulletPoints.map((text) => ({
          text,
          enabled: true,
        })),
      })
    }

    await payload.updateGlobal({
      slug: 'cvExperience',
      data: {
        experienceItems,
      },
    })

    console.info(`Seeded cvExperience with ${experienceItems.length} items.`)
  } catch (error) {
    console.error('Failed to seed cvExperience:', error)
    process.exitCode = 1
  } finally {
    if (payload) {
      await payload.db?.destroy?.()
    }
  }
}

void main()
