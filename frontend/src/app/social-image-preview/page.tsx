import type { Metadata } from "next";

import BrandLockupView from "@/components/branding/BrandLockupView";
import { getServerHeroBranding } from "@/data/HeroBranding";

import styles from "./page.module.scss";

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default async function SocialImagePreview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const width = parsePositiveInt(
    Array.isArray(params.width) ? params.width[0] : params.width,
    DEFAULT_WIDTH,
  );
  const height = parsePositiveInt(
    Array.isArray(params.height) ? params.height[0] : params.height,
    DEFAULT_HEIGHT,
  );

  const heroBranding = await getServerHeroBranding();
  const activeRoleTitle = heroBranding.activeRoleTitle.trim();
  const isWide = width >= 1000;
  const lockupScale = isWide ? 1.82 : 1.58;
  const roleLetterSpacing =
    heroBranding.activeRoleLetterSpacing?.trim() ||
    (isWide ? "0.1em" : "0.08em");

  return (
    <main className={styles.page} data-social-image-preview="true">
      <div
        className={styles.frame}
        data-social-image-frame="true"
        style={{ width, height }}
      >
        <div className={styles.background} />
        <div className={styles.overlayPrimary} />
        <div className={styles.overlaySecondary} />
        <div
          className={styles.content}
          style={{ padding: isWide ? "72px 84px" : "56px 64px" }}
        >
          <div
            className={styles.card}
            style={{
              padding: isWide ? "18px 32px 20px" : "16px 26px 18px",
            }}
          >
            <div
              className={styles.lockup}
              style={{ transform: `scale(${lockupScale})` }}
            >
              <BrandLockupView
                roleTitle={activeRoleTitle}
                roleLetterSpacing={roleLetterSpacing}
                logoSrc="/images/hero/bb-logo.svg"
                logoAlt=""
                roleTitleClassName={styles.roleTitle}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
