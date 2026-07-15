export interface OrbGrabTooltipEligibility {
  isKnown: boolean;
  hasDragged: boolean;
  hasCollided: boolean;
}

/**
 * The grab hint is eligible only after persisted interaction state has loaded
 * and confirms that the user has neither dragged nor collided with the orb.
 */
export function shouldShowOrbGrabTooltip({
  isKnown,
  hasDragged,
  hasCollided,
}: OrbGrabTooltipEligibility) {
  return isKnown && !hasDragged && !hasCollided;
}
