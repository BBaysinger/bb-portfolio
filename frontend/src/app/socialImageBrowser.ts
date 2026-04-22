import { headers } from "next/headers";
import { chromium } from "playwright";

import { defaultSiteOrigin } from "./siteMetadata";

type SocialImageOptions = {
  width: number;
  height: number;
};

export const runtime = "nodejs";

const DEVELOPMENT_SITE_ORIGIN = "http://localhost:3000";
const SOCIAL_IMAGE_TIMEOUT_MS = 30_000;

const resolveRequestOrigin = async () => {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");

  if (host) {
    const proto =
      requestHeaders.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, "");

  return process.env.NODE_ENV === "production"
    ? defaultSiteOrigin
    : DEVELOPMENT_SITE_ORIGIN;
};

export const createPortfolioSocialImage = async ({
  width,
  height,
}: SocialImageOptions) => {
  // Canonical social-image renderer: capture the dedicated preview route in a
  // headless browser so OG/Twitter images match the actual app styling.
  const origin = await resolveRequestOrigin();
  const previewUrl = new URL("/social-image-preview", origin);
  previewUrl.searchParams.set("width", String(width));
  previewUrl.searchParams.set("height", String(height));

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(previewUrl.toString(), {
      waitUntil: "networkidle",
      timeout: SOCIAL_IMAGE_TIMEOUT_MS,
    });

    await page.addStyleTag({
      content: `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: #050a10 !important;
        }

        nav,
        footer,
        header,
        nextjs-portal,
        button[aria-label="Open Next.js Dev Tools"],
        button[aria-label="Open menu"],
        [aria-label="Primary navigation"],
        [aria-label="Mobile navigation"],
        [aria-label="Footer navigation"] {
          display: none !important;
        }

        [data-social-image-preview="true"],
        [data-social-image-preview="true"] * {
          visibility: visible !important;
        }

        [data-social-image-preview="true"] {
          position: fixed !important;
          inset: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: ${width}px !important;
          height: ${height}px !important;
          min-height: 0 !important;
        }

        [data-social-image-frame="true"] {
          inset: 0 !important;
        }
      `,
    });

    await page.evaluate(async () => {
      if ("fonts" in document) {
        await document.fonts.ready;
      }

      const logo = document.querySelector(
        '[data-social-image-frame="true"] img[alt=""]',
      ) as HTMLImageElement | null;

      if (logo) {
        if (!logo.complete) {
          await new Promise<void>((resolve, reject) => {
            logo.addEventListener("load", () => resolve(), { once: true });
            logo.addEventListener(
              "error",
              () => reject(new Error("Social image logo failed to load")),
              { once: true },
            );
          });
        }

        if (typeof logo.decode === "function") {
          await logo.decode();
        }
      }

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    });

    await page.waitForFunction(
      () => {
        const logo = document.querySelector(
          '[data-social-image-frame="true"] img[alt=""]',
        ) as HTMLImageElement | null;

        if (!logo || !logo.complete || logo.naturalWidth <= 0) return false;

        const rect = logo.getBoundingClientRect();
        return rect.width > 20 && rect.height > 20;
      },
      undefined,
      { timeout: SOCIAL_IMAGE_TIMEOUT_MS },
    );

    const frame = page.locator('[data-social-image-frame="true"]');
    await frame.waitFor({ state: "visible", timeout: SOCIAL_IMAGE_TIMEOUT_MS });

    const screenshot = await page.screenshot({ type: "png" });
    const responseBody = new Uint8Array(screenshot);

    return new Response(responseBody, {
      headers: {
        "content-type": "image/png",
        "cache-control":
          "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } finally {
    await browser.close();
  }
};
