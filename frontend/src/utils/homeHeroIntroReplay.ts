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

export const requestHomeHeroIntroReplay = () => {
  writeSessionFlag(HOME_HERO_REPLAY_ON_RETURN_KEY, true);

  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(HOME_HERO_INTRO_REPLAY_REQUESTED_EVENT));
};

export const consumeHomeHeroIntroReplayRequest = () => {
  const shouldReplay = readSessionFlag(HOME_HERO_REPLAY_ON_RETURN_KEY);

  if (shouldReplay) {
    writeSessionFlag(HOME_HERO_REPLAY_ON_RETURN_KEY, false);
  }

  return shouldReplay;
};

export const shouldPlayHomeHeroIntroOnEntry = () => {
  if (typeof window === "undefined") return false;

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
