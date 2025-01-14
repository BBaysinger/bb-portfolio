// Directions are defined from the user's perspective, e.g., swiping right means the carousel shifts left.
const Direction = {
  LEFT: "Left",
  RIGHT: "Right",
} as const;

// Weather the scroll was triggered by natural HTML element scroll or programmatically (via routing/buttons).
const Source = {
  IMPERATIVE: "Imperative",
  NATURAL: "Natural",
} as const;

type DirectionType = (typeof Direction)[keyof typeof Direction];
type SourceType = (typeof Source)[keyof typeof Source];

// CarouselProps defines the component's expected props, supporting features like callbacks, dynamic scroll positions, and debugging.
interface CarouselProps {
  slides: React.ReactNode[]; // Array of slides (React elements) to display.
  slideSpacing: number; // Space between slides in pixels.
  initialIndex?: number; // Optional starting index for the carousel.
  onIndexUpdate?: (scrollIndex: number) => void; // Callback for index changes during scroll.
  debug?: string | number | boolean | null; // Debugging flag for showing additional info.
  wrapperClassName?: string; // Custom CSS class for the wrapper.
  slideClassName?: string; // Custom CSS class for slides.
  sliderClassName?: string; // Custom CSS class for the slider.
  onScrollUpdate?: (scrollLeft: number) => void; // Callback for scroll position changes.
  externalScrollLeft?: number; // External scroll position (used in slave mode).
  onStabilizationUpdate?: (
    index: number,
    source: SourceType,
    direction: DirectionType,
  ) => void; // Callback when the scroll stabilizes on a specific index.
  stabilizationDelay?: number; // Delay (ms) before a new stable index is reported.
  id?: string; // Optional ID for debugging or DOM referencing.
}

// CarouselRef defines methods exposed to parent components via `ref`.
interface CarouselRef {
  scrollToSlide: (targetIndex: number) => void; // Scroll programmatically to a specific slide.
  setExternalScrollPosition: (scrollLeft: number) => void; // Manually adjust the scroll position in slave mode.
}

export { Direction, Source };
export type { DirectionType, SourceType, CarouselProps, CarouselRef };
