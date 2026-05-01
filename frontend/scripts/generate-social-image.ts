import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import {
  DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
  HERO_ROLE_TITLE_CLASS_TO_LETTER_SPACING,
  isHeroRoleTitleClassName,
  type HeroRoleTitleClassName,
} from "../src/data/heroRoleTitleClasses";

// TODO: Replace this manual static generator with a share-image pipeline that
// updates automatically and supports per-page text/image variants.

type BrandingLockup = {
  roleTitle: string;
  roleTitleClassName?: HeroRoleTitleClassName;
};

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;
const FALLBACK_ROLE_TITLE = "Front-End / UI Developer";
const DEFAULT_OUTPUT_RELATIVE_PATH = "public/images/social/portfolio-share.png";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "..");

const buildRoleTitleClassRules = () =>
  Object.entries(HERO_ROLE_TITLE_CLASS_TO_LETTER_SPACING)
    .map(
      ([className, letterSpacing]) =>
        `.${className} { letter-spacing: ${letterSpacing}; }`,
    )
    .join("\n");

const encodeDataUrl = (mimeType: string, contents: Buffer | string) => {
  const buffer =
    typeof contents === "string" ? Buffer.from(contents) : contents;
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
};

const parseArgs = () => {
  const parsed = new Map<string, string>();

  for (let index = 2; index < process.argv.length; index += 1) {
    const token = process.argv[index];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const next = process.argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed.set(key, "true");
      continue;
    }

    parsed.set(key, next);
    index += 1;
  }

  return {
    outputPath: parsed.get("output")?.trim(),
    roleTitle: parsed.get("role-title")?.trim(),
    roleTitleClassName: parsed.get("role-title-class-name")?.trim(),
    backendUrl:
      parsed.get("backend-url")?.trim() ||
      process.env.SOCIAL_IMAGE_BACKEND_URL?.trim() ||
      process.env.BACKEND_INTERNAL_URL?.trim(),
  };
};

const fetchBrandingLockup = async (
  backendUrl: string | undefined,
): Promise<BrandingLockup | undefined> => {
  if (!backendUrl) return undefined;

  try {
    const response = await fetch(
      `${backendUrl.replace(/\/$/, "")}/api/branding-lockup/`,
      {
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) return undefined;

    const payload = (await response.json()) as {
      success?: boolean;
      data?: {
        activeRoleTitle?: unknown;
        activeRoleTitleClassName?: unknown;
      };
    };

    if (!payload.success || !payload.data) return undefined;

    const roleTitle =
      typeof payload.data.activeRoleTitle === "string" &&
      payload.data.activeRoleTitle.trim()
        ? payload.data.activeRoleTitle.trim()
        : FALLBACK_ROLE_TITLE;

    const roleTitleClassName = isHeroRoleTitleClassName(
      payload.data.activeRoleTitleClassName,
    )
      ? payload.data.activeRoleTitleClassName
      : DEFAULT_HERO_ROLE_TITLE_CLASS_NAME;

    return { roleTitle, roleTitleClassName };
  } catch {
    return undefined;
  }
};

const buildMarkup = ({
  backgroundDataUrl,
  logoDataUrl,
  roleTitle,
  roleTitleClassName,
}: {
  backgroundDataUrl: string;
  logoDataUrl: string;
  roleTitle: string;
  roleTitleClassName: HeroRoleTitleClassName;
}) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Portfolio Social Image</title>
    <style>
      :root {
        color-scheme: dark;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        width: ${IMAGE_WIDTH}px;
        height: ${IMAGE_HEIGHT}px;
        margin: 0;
        overflow: hidden;
        background: #050a10;
        font-family: Roboto, Arial, Helvetica, sans-serif;
      }

      body {
        display: grid;
        place-items: center;
      }

      .frame {
        position: relative;
        width: ${IMAGE_WIDTH}px;
        height: ${IMAGE_HEIGHT}px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #050a10;
        color: #f3f6f8;
      }

      .background,
      .overlay-primary,
      .overlay-secondary {
        position: absolute;
        inset: 0;
      }

      .background {
        background-image: url("${backgroundDataUrl}");
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
      }

      .overlay-primary {
        background: linear-gradient(
          90deg,
          rgba(2, 6, 10, 0.9) 0%,
          rgba(2, 6, 10, 0.74) 32%,
          rgba(2, 6, 10, 0.46) 56%,
          rgba(2, 6, 10, 0.6) 100%
        );
        opacity: 0;
      }

      .overlay-secondary {
        background: linear-gradient(
          180deg,
          rgba(3, 7, 13, 0.28) 0%,
          rgba(3, 7, 13, 0.42) 100%
        );
        opacity: 0;
      }

      .content {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 72px 84px;
      }

      .card {
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: 100%;
        padding: 9px 16px 10px;
        background: rgba(6, 10, 14, 0.86);
        border-radius: 8px;
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.04),
          0 8px 18px rgba(0, 0, 0, 0.12),
          0 18px 42px rgba(0, 0, 0, 0.24);
      }

      .lockup {
        --lockup-base-height: 47px;
        --lockup-base-width: 266px;
        --lockup-scale: 2;
        width: calc(var(--lockup-base-width) * var(--lockup-scale));
        height: calc(var(--lockup-base-height) * var(--lockup-scale));
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .lockup-inner,
      .brand-lockup {
        display: flex;
        align-items: center;
      }

      .lockup-inner {
        transform: scale(2);
        transform-origin: center center;
      }

      .logo {
        width: auto;
        height: auto;
        max-height: 38px;
        display: block;
      }

      .text {
        display: flex;
        flex-direction: column;
        position: relative;
        top: -0.5px;
        margin-left: 8px;
      }

      .text > div {
        margin-block-start: 0;
        margin-bottom: -2px;
        font-size: 24px;
        line-height: 1;
      }

      .name {
        margin-top: -3px;
        margin-bottom: -7px;
        letter-spacing: 0em;
      }

      .name span:first-child {
        color: #999;
        margin-right: -2px;
      }

      .name span:last-child {
        color: #93c13e;
      }

      .role-row {
        margin-top: -3px;
        font-size: 13.9px;
        color: #fff;
        transform: translateY(-1.5px);
      }

      .role-title {
        margin-left: 1px;
        color: #fff;
        font-size: 16px;
        white-space: nowrap;
      }

      .FEUIDev.role-title {
        letter-spacing: 2.55px;
      }

      .FEDev.role-title {
      }

      .UIDev.role-title {
      }

      ${buildRoleTitleClassRules()}
    </style>
  </head>
  <body>
    <main class="frame">
      <div class="background"></div>
      <div class="overlay-primary"></div>
      <div class="overlay-secondary"></div>
      <div class="content">
        <div class="card">
          <div class="lockup">
            <div class="lockup-inner">
              <div class="brand-lockup">
                <img class="logo" src="${logoDataUrl}" alt="" />
                <div class="text">
                  <div class="name"><span>BRADLEY</span> <span>BAYSINGER</span></div>
                  <div class="role-row"><span class="role-title ${roleTitleClassName}">${roleTitle}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </body>
</html>`;

const main = async () => {
  const args = parseArgs();
  const outputPath = path.resolve(
    frontendDir,
    args.outputPath || DEFAULT_OUTPUT_RELATIVE_PATH,
  );

  const [backgroundBuffer, logoBuffer, remoteBrandingLockup] =
    await Promise.all([
      readFile(path.join(frontendDir, "public/images/social/bg.png")),
      readFile(path.join(frontendDir, "public/images/hero/bb-logo.svg")),
      fetchBrandingLockup(args.backendUrl),
    ]);

  const roleTitle =
    args.roleTitle || remoteBrandingLockup?.roleTitle || FALLBACK_ROLE_TITLE;
  const roleTitleClassName = isHeroRoleTitleClassName(args.roleTitleClassName)
    ? args.roleTitleClassName
    : remoteBrandingLockup?.roleTitleClassName ||
      DEFAULT_HERO_ROLE_TITLE_CLASS_NAME;

  const markup = buildMarkup({
    backgroundDataUrl: encodeDataUrl("image/png", backgroundBuffer),
    logoDataUrl: encodeDataUrl("image/svg+xml", logoBuffer),
    roleTitle,
    roleTitleClassName,
  });

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
      deviceScaleFactor: 1,
    });

    await page.setContent(markup, { waitUntil: "load" });
    await page.evaluate(async () => {
      if ("fonts" in document) {
        await document.fonts.ready;
      }

      const images = Array.from(document.images);
      await Promise.all(
        images.map(async (image) => {
          if (!image.complete) {
            await new Promise<void>((resolve, reject) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener(
                "error",
                () => reject(new Error("Social image asset failed to load")),
                { once: true },
              );
            });
          }

          if (typeof image.decode === "function") {
            await image.decode();
          }
        }),
      );
    });

    await mkdir(path.dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, type: "png" });
  } finally {
    await browser.close();
  }

  process.stdout.write(`Wrote ${path.relative(frontendDir, outputPath)}\n`);
};

await main();
