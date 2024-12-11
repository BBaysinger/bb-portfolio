import mitt, { Emitter } from "mitt";

// Define the event map type
interface HoverCapabilityWatcherEvents {
  hoverCapabilityChanged: { isHoverCapable: boolean };
  [event: string | symbol]: unknown; // Support additional dynamic event types
}

/**
 * HoverCapabilityWatcher
 *
 * Detects if the device supports hover interactions and dispatches
 * a custom event when this capability changes. This class is implemented
 * as a singleton to ensure efficient resource management and to centralize
 * hover capability state.
 *
 * @author Bradley Baysinger
 * @contributor ChatGPT
 * @since 2024-12-10
 * @version N/A
 */
export default class HoverCapabilityWatcher {
  // Static instance ensures only one object is created
  private static _instance: HoverCapabilityWatcher | null = null;

  // Media query to detect hover capability
  private static mediaQuery = "(hover: hover)";
  private mediaQueryList: MediaQueryList;
  private emitter: Emitter<HoverCapabilityWatcherEvents>;
  private debug: boolean = false;

  /**
   * Private constructor to prevent direct instantiation.
   * Encapsulates initialization logic for hover detection.
   */
  private constructor() {
    this.mediaQueryList = window.matchMedia(HoverCapabilityWatcher.mediaQuery);
    this.emitter = mitt<HoverCapabilityWatcherEvents>();

    // Dispatch the initial state
    this.dispatchEvent({ isHoverCapable: this.mediaQueryList.matches });

    // Listen for changes in hover capability
    this.mediaQueryList.addEventListener("change", this.handleMediaChange);
  }

  /**
   * Provides access to the singleton instance of HoverCapabilityWatcher.
   * Ensures a single source of truth for hover capability state across the application.
   *
   * @returns {HoverCapabilityWatcher} The singleton instance.
   */
  static get instance(): HoverCapabilityWatcher {
    if (!HoverCapabilityWatcher._instance) {
      HoverCapabilityWatcher._instance = new HoverCapabilityWatcher();
    }
    return HoverCapabilityWatcher._instance;
  }

  /**
   * Adds an event listener for hover capability changes.
   * Encapsulates the event emitter's subscription logic.
   *
   * @param {(event: { isHoverCapable: boolean }) => void} handler - The callback function for the event.
   */
  addEventListener(
    handler: (event: { isHoverCapable: boolean }) => void,
  ): void {
    this.emitter.on("hoverCapabilityChanged", handler);
  }

  /**
   * Removes an event listener for hover capability changes.
   * Prevents memory leaks by enabling proper unsubscription.
   *
   * @param {(event: { isHoverCapable: boolean }) => void} handler - The callback function to remove.
   */
  removeEventListener(
    handler: (event: { isHoverCapable: boolean }) => void,
  ): void {
    this.emitter.off("hoverCapabilityChanged", handler);
  }

  /**
   * Cleans up resources by removing event listeners and clearing the emitter.
   * Useful in environments like single-page applications where the utility might
   * need to be reinitialized or disposed of.
   */
  destroy(): void {
    this.mediaQueryList.removeEventListener("change", this.handleMediaChange);
    this.emitter.all.clear(); // Clear all registered event listeners
    HoverCapabilityWatcher._instance = null; // Allow for garbage collection
  }

  /**
   * Returns whether the device currently supports hover interactions.
   * Provides a synchronous way to check hover capability.
   *
   * @returns {boolean} True if the device supports hover interactions; otherwise, false.
   */
  get isHoverCapable(): boolean {
    return this.mediaQueryList.matches;
  }

  /**
   * Handles changes to the media query and dispatches events.
   * Maintains consistency by notifying all listeners when hover capability changes.
   *
   * @param {MediaQueryListEvent} event - The media query change event.
   */
  private handleMediaChange = (event: MediaQueryListEvent): void => {
    this.dispatchEvent({ isHoverCapable: event.matches });
  };

  /**
   * Dispatches an event with hover capability details.
   * Encapsulates the logic for notifying subscribers about changes.
   *
   * @param {HoverCapabilityWatcherEvents["hoverCapabilityChanged"]} detail - The hover capability details.
   */
  private dispatchEvent(
    detail: HoverCapabilityWatcherEvents["hoverCapabilityChanged"],
  ): void {
    if (this.debug) {
      console.info("HoverCapabilityWatcher event dispatched:", detail);
    }
    this.emitter.emit("hoverCapabilityChanged", detail);
  }
}
