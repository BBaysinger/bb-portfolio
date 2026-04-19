const HOME_HERO_REPLAY_ON_RETURN_KEY = "home-hero-replay-on-return";
const HOME_HERO_INTRO_SEEN_IN_SESSION_KEY = "home-hero-intro-seen-in-session";

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
