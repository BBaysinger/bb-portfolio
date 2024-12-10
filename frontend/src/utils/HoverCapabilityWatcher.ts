import mitt from "mitt";

/**
 * HoverCapabilityWatcher
 *
 * Detects if the device supports hover interactions and dispatches
 * a custom event when this capability changes.
 * Automatically initializes itself as a singleton when
 * `HoverCapabilityWatcher.instance` is accessed.
 */
export default class HoverCapabilityWatcher {
  private static _instance: HoverCapabilityWatcher | null = null;
  // Media query to detect hover capability
  private static mediaQuery = "(hover: hover)";
  private mediaQueryList: MediaQueryList | null = null;

  // Mitt event emitter
  private emitter = mitt();

  /**
   * Private constructor to prevent direct instantiation.
   */
  private constructor() {
    this.mediaQueryList = window.matchMedia(HoverCapabilityWatcher.mediaQuery);

    // Dispatch the initial state
    this.dispatchEvent("hoverCapabilityChanged", {
      isHoverCapable: this.mediaQueryList.matches,
    });

    // Add an event listener for changes in hover capability
    this.mediaQueryList.addEventListener("change", (event) => {
      this.dispatchEvent("hoverCapabilityChanged", {
        isHoverCapable: event.matches,
      });
    });
  }

  /**
   * Returns the singleton instance of the HoverCapabilityWatcher.
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
   * Adds an event listener for a specific event type.
   *
   * @param {string} type - The event type to listen for.
   * @param {(detail: any) => void} handler - The callback function for the event.
   */
  addEventListener(type: string, handler: (detail: any) => void): void {
    this.emitter.on(type, handler);
  }

  /**
   * Removes an event listener for a specific event type.
   *
   * @param {string} type - The event type to remove the listener for.
   * @param {(detail: any) => void} handler - The callback function to remove.
   */
  removeEventListener(type: string, handler: (detail: any) => void): void {
    this.emitter.off(type, handler);
  }

  /**
   * Dispatches an event of a specific type with optional detail data.
   *
   * @param {string} type - The event type to dispatch.
   * @param {any} detail - The detail data to include with the event.
   */
  private dispatchEvent(type: string, detail: any): void {
    this.emitter.emit(type, detail);
  }

  /**
   * Manually checks if the device currently supports hover interactions.
   *
   * @returns {boolean} True if the device supports hover interactions; otherwise, false.
   */
  get isHoverCapable(): boolean {
    const retVal = this.mediaQueryList?.matches ?? false;
    // console.info('isHoverCapable:', retVal);
    return retVal;
  }
}
