/**
 * Home hero intro replay gating.
 *
 * Display criteria for the paragraph animator intro message:
 * - Show it on the first home-page entry of a browser session.
 * - Show it again after the app explicitly requests a replay because the user
 *   left the site, closed the tab or window and later came back, or logged out.
 * - Do not show it again just because the user navigated around inside the site
 *   and then came back to home during the same session.
 * - Do not show it again just because the page was backgrounded and then
 *   foregrounded in the same session.
 *
 * The replay request is consumed once, so the next home entry behaves like a
 * normal post-intro session unless another qualifying event requests it again.
 */
const HOME_HERO_REPLAY_ON_RETURN_KEY = "home-hero-replay-on-return";
const HOME_HERO_INTRO_SEEN_IN_SESSION_KEY = "home-hero-intro-seen-in-session";
export const HOME_HERO_INTRO_REPLAY_REQUESTED_EVENT =
  "home-hero-intro-replay-requested";

type HomeHeroIntroReplaySource = "explicit" | "page-exit";

type RequestHomeHeroIntroReplayOptions = {
  dispatchEvent?: boolean;
  source?: HomeHeroIntroReplaySource;
};

const readSessionFlag = (key: string) => {
  if (typeof window === "undefined") return false;

  try {
    return sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

const writeSessionFlag = (key: string, value: boolean) => {
  if (typeof window === "undefined") return;

  try {
    if (value) {
      sessionStorage.setItem(key, "true");
      return;
    }

    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures; replay is best-effort.
  }
};

const readSessionValue = (key: string) => {
  if (typeof window === "undefined") return null;

  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSessionValue = (key: string, value: string | null) => {
  if (typeof window === "undefined") return;

  try {
    if (value === null) {
      sessionStorage.removeItem(key);
      return;
    }

    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; replay is best-effort.
  }
};

const getNavigationType = () => {
  if (typeof window === "undefined") return null;

  try {
    const navigationEntries = window.performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    return navigationEntries[0]?.type ?? null;
  } catch {
    return null;
  }
};

export const shouldReplayHomeHeroIntroOnPageShow = (
  event: Pick<PageTransitionEvent, "persisted">,
) => {
  if (!event.persisted) return false;

  return getNavigationType() === "back_forward";
};

export const requestHomeHeroIntroReplay = ({
  dispatchEvent = true,
  source = "explicit",
}: RequestHomeHeroIntroReplayOptions = {}) => {
  writeSessionValue(HOME_HERO_REPLAY_ON_RETURN_KEY, source);

  if (!dispatchEvent || typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(HOME_HERO_INTRO_REPLAY_REQUESTED_EVENT));
};

export const clearPendingPageExitHomeHeroIntroReplay = () => {
  const replaySource = readSessionValue(HOME_HERO_REPLAY_ON_RETURN_KEY);
  if (replaySource !== "page-exit") return;

  writeSessionValue(HOME_HERO_REPLAY_ON_RETURN_KEY, null);
};

export const consumeHomeHeroIntroReplayRequest = () => {
  const replaySource = readSessionValue(HOME_HERO_REPLAY_ON_RETURN_KEY);
  const shouldReplay = replaySource !== null;

  if (shouldReplay) {
    writeSessionValue(HOME_HERO_REPLAY_ON_RETURN_KEY, null);
  }

  return shouldReplay;
};

export const shouldPlayHomeHeroIntroOnEntry = () => {
  if (typeof window === "undefined") return false;

  if (getNavigationType() === "reload") {
    clearPendingPageExitHomeHeroIntroReplay();
  }

  if (consumeHomeHeroIntroReplayRequest()) {
    writeSessionFlag(HOME_HERO_INTRO_SEEN_IN_SESSION_KEY, true);
    return true;
  }

  const hasSeenIntroInSession = readSessionFlag(
    HOME_HERO_INTRO_SEEN_IN_SESSION_KEY,
  );
  if (hasSeenIntroInSession) return false;

  writeSessionFlag(HOME_HERO_INTRO_SEEN_IN_SESSION_KEY, true);
  return true;
};
