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
  slides: React.ReactNode[];
  slideSpacing: number;
  initialIndex?: number;
  debug?: boolean | number;

  // Behavioral props
  isSlaveMode?: boolean;
  stabilizationDelay?: number;

  // Event callbacks
  onScrollUpdate?: (scrollLeft: number) => void;
  onIndexUpdate?: (index: number) => void;
  onStabilizationUpdate?: (
    index: number,
    source: SourceType,
    direction: DirectionType,
  ) => void;

  // Styling
  wrapperClassName?: string; // fallback class
  slideClassName?: string; // fallback class
  sliderClassName?: string; // fallback class

  classNamePrefix?: string; // e.g. "bb-"
  styleMap?: { [key: string]: string }; // SCSS module object
  layerId?: string; // e.g. "phones", "laptops"
}

// CarouselRef defines methods exposed to parent components via `ref`.
interface CarouselRef {
  scrollToSlide: (targetIndex: number) => void; // Scroll programmatically to a specific slide.
  setExternalScrollPosition: (scrollLeft: number) => void; // Manually adjust the scroll position in slave mode.
}

export { Direction, Source };
export type { DirectionType, SourceType, CarouselProps, CarouselRef };
