import mitt from "mitt";
import Point from "@mapbox/point-geometry";
import ExecutionEnvironment from "exenv";
import HoverCapabilityWatcher from "utils/HoverCapabilityWatcher";

/**
 * Swipe
 *
 * Detects and manages swipe gestures on given elements and emits events for detected swipes.
 */
export default class Swipe {
  static SWIPE_UP_LT = "swipe_up_lt";
  static SWIPE_UP_RT = "swipe_up_rt";
  static SWIPE_DN_RT = "swipe_dn_rt";
  static SWIPE_DN_LT = "swipe_dn_lt";
  static SWIPE_UP = "swipe_up";
  static SWIPE_RT = "swipe_rt";
  static SWIPE_DN = "swipe_dn";
  static SWIPE_LT = "swipe_lt";

  static MIN_PIXEL_SWIPE_DIST = 200;

  private static _instance: Swipe | null = null;

  private emitter = mitt<{ swipe: { direction: string; angle: number } }>();

  private _startCoords: Point | null = null;
  private _swipeAngle: number | null = null;
  private _swipeDirection: string | null = null;

  private _nMinSwipeDistance = 0;
  private _startTime = 0;

  private elements: Array<HTMLElement> = [];
  private started = false;

  bDebug = false; // Debug mode enabled by default
  maxTime = 500; // Maximum swipe duration in ms

  /**
   * Creates an instance of Swipe.
   *
   * @param {number} [thresholdPercent=0.1] - Minimum threshold for swipe movement (as a percentage of screen width).
   */
  private constructor(public thresholdPercent = 0.1) {}

  /**
   * Get the singleton instance of Swipe.
   */
  static get instance(): Swipe {
    if (!Swipe._instance) {
      Swipe._instance = new Swipe();
    }
    return Swipe._instance;
  }

  /**
   * Get the current swipe angle.
   */
  get swipeAngle(): number | null {
    return this._swipeAngle;
  }

  /**
   * Get the current swipe direction.
   */
  get swipeDirection(): string | null {
    return this._swipeDirection;
  }

  /**
   * Initialize swipe handling for the given elements.
   * @param {Array<HTMLElement>} elements
   */
  init(elements: Array<HTMLElement>) {
    this.update();
    this.elements = [...elements];

    if (!Array.isArray(this.elements)) {
      throw new Error("This is not an array.");
    }

    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener("resize", this.handleResize);
      window.addEventListener("orientationchange", this.handleResize);

      this.elements.forEach((element) => {
        element.addEventListener("touchstart", this.handlePointerDown);
        element.addEventListener("touchend", this.handlePointerUp);
        element.addEventListener("mousedown", this.handlePointerDown);
        element.addEventListener("mouseup", this.handlePointerUp);
      });
    }
  }

  /**
   * Cleanup event listeners and resources.
   */
  kill() {
    this.cancelMouseMove(null);

    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("orientationchange", this.handleResize);

    this.elements.forEach((element) => {
      element.removeEventListener("touchstart", this.handlePointerDown);
      element.removeEventListener("touchend", this.handlePointerUp);
      element.removeEventListener("mousedown", this.handlePointerDown);
      element.removeEventListener("mouseup", this.handlePointerUp);
    });
  }

  /**
   * Add an event listener for swipe events.
   * @param {(data: { direction: string; angle: number }) => void} listener
   */
  onSwipe(listener: (data: { direction: string; angle: number }) => void) {
    this.emitter.on("swipe", listener);
  }

  /**
   * Remove an event listener for swipe events.
   * @param {(data: { direction: string; angle: number }) => void} listener
   */
  offSwipe(listener: (data: { direction: string; angle: number }) => void) {
    this.emitter.off("swipe", listener);
  }

  private handleResize = () => {
    this.update();
  };

  private update() {
    const screenThreshold = window.innerWidth * this.thresholdPercent;
    this._nMinSwipeDistance = Math.max(
      screenThreshold,
      Swipe.MIN_PIXEL_SWIPE_DIST,
    );
  }

  private handlePointerDown = (evt: Event) => {
    let pageXY;

    if (evt instanceof MouseEvent) {
      pageXY = new Point(evt.pageX, evt.pageY);
    } else if (evt instanceof TouchEvent) {
      pageXY = new Point(evt.touches[0].clientX, evt.touches[0].clientY);
    } else {
      throw new Error(
        "Event.page X/Y or Event.touches[0].client X/Y required.",
      );
    }

    this._startCoords = new Point(pageXY.x, pageXY.y);
    this._startTime = Date.now();

    let success = false;

    this.elements.forEach((element) => {
      let targ = evt.target as HTMLElement;
      while (targ.parentNode) {
        if (targ === element) {
          success = true;
          break;
        }
        targ = targ.parentNode as HTMLElement;
      }
    });

    this.started = success;

    if (!success) return;

    this.elements.forEach((element) => {
      element.addEventListener("mousemove", this.handlePointerMove);
      element.addEventListener("touchmove", this.handlePointerMove);
    });

    if (!HoverCapabilityWatcher.instance.isHoverCapable) {
      evt.preventDefault();
    }
  };

  private cancelMouseMove(_: Event | null) {
    this.elements.forEach((element) => {
      element.removeEventListener("mousemove", this.handlePointerMove);
      element.removeEventListener("touchmove", this.handlePointerMove);
    });
  }

  private handlePointerUp = (evt: Event) => {
    this.cancelMouseMove(evt);
  };

  private handlePointerMove = (evt: Event) => {
    if (!this.started || !this._startCoords) return;

    let pageXY;

    if (evt instanceof PointerEvent) {
      pageXY = new Point(evt.pageX, evt.pageY);
    } else if (evt instanceof TouchEvent) {
      pageXY = new Point(evt.touches[0].clientX, evt.touches[0].clientY);
    } else {
      throw new Error(
        "Event.page X/Y or Event.touches[0].client X/Y required.",
      );
    }

    const now = Date.now();
    const swipeDistance = this._startCoords.dist(pageXY);

    if (swipeDistance > this._nMinSwipeDistance) {
      if (now - this._startTime < this.maxTime) {
        this._swipeAngle =
          Math.atan2(
            pageXY.y - this._startCoords.y,
            pageXY.x - this._startCoords.x,
          ) *
          (180 / Math.PI);

        if (this._swipeAngle < -157.5 || this._swipeAngle > 157.5)
          this._swipeDirection = Swipe.SWIPE_LT;
        else if (this._swipeAngle < -112.5)
          this._swipeDirection = Swipe.SWIPE_UP_LT;
        else if (this._swipeAngle < -67.5)
          this._swipeDirection = Swipe.SWIPE_UP;
        else if (this._swipeAngle < -22.5)
          this._swipeDirection = Swipe.SWIPE_UP_RT;
        else if (this._swipeAngle < 22.5) this._swipeDirection = Swipe.SWIPE_RT;
        else if (this._swipeAngle < 67.5)
          this._swipeDirection = Swipe.SWIPE_DN_RT;
        else if (this._swipeAngle < 112.5)
          this._swipeDirection = Swipe.SWIPE_DN;
        else this._swipeDirection = Swipe.SWIPE_DN_LT;

        if (this.bDebug) {
          console.info(
            `Swipe detected: ${this._swipeDirection}, Angle: ${this._swipeAngle}`,
          );
        }

        this.cancelMouseMove(evt);

        this.emitter.emit("swipe", {
          direction: this._swipeDirection,
          angle: this._swipeAngle,
        });
      }
    }

    if (!HoverCapabilityWatcher.instance.isHoverCapable) {
      evt.preventDefault();
    }
  };
}
