import Signal from "simplesignal";
import Point from "@mapbox/point-geometry";
import ExecutionEnvironment from "exenv";
import Sniffer from "utils/Sniffer";

/**
 *
 *
 * @export
 * @class Swipe
 */
export default class Swipe {
  // TODO: This should maybe work on pointer move, so it can determine swipe before pointer up.
  // And maybe to disable scrolling when necessary.

  /**
   *
   *
   * @static
   * @memberof Swipe
   */
  static SWIPE_UP_LT = "swipe_up_lt";

  /**
   *
   *
   * @static
   * @memberof Swipe
   */
  static SWIPE_UP_RT = "swipe_up_rt";

  /**
   * Diagnal swipe content.
   *
   * @static
   * @memberof Swipe
   */
  static SWIPE_DN_RT = "swipe_dn_rt";

  /**
   * Diagnal swipe content.
   *
   * @static
   * @memberof Swipe
   */
  static SWIPE_DN_LT = "swipe_dn_lt";

  /**
   *
   *
   * @static
   * @memberof Swipe
   */
  static SWIPE_UP = "swipe_up";

  /**
   *
   *
   * @static
   * @memberof Swipe
   */
  static SWIPE_RT = "swipe_rt";

  /**
   *
   *
   * @static
   * @memberof Swipe
   */
  static SWIPE_DN = "swipe_dn";

  /**
   *
   *
   * @static
   * @memberof Swipe
   */
  static SWIPE_LT = "swipe_lt";

  /**
   * On wider screens (touch laptops, tablets) it's not natural to require swiping 1/3 of screen width.
   *
   * @static
   * @memberof Swipe
   */
  static MIN_PIXEL_SWIPE_DIST = 200;

  /**
   * The signal that emittes for a swipe.
   *
   * @readonly
   * @memberof Swipe
   */
  get swiped() {
    return this._swiped;
  }

  /**
   * The direction of the swipe.
   *
   * @readonly
   * @memberof Swipe
   */
  get swipeDirection() {
    return this._swipeDirection;
  }

  /**
   *
   *
   * @memberof Swipe
   */
  _swipeDirection:string | null = null;

  /**
   *
   *
   * @type {Point}
   * @memberof Swipe
   */
  _startCoords:Point | null = null;

  /**
   * The direction of the swipe.
   *
   * @readonly
   * @memberof Swipe
   */
  get swipeAngle() {
    return this._swipeAngle;
  }

  /**
   * The direction of the swipe.
   *
   * @readonly
   * @memberof Swipe
   */
  _swipeAngle:number | null = null;

  /**
   * Debug mode enabled.
   *
   * @memberof Swipe
   */
  bDebug = false;

  /**
   * Time allowed to make swipe, in milliseconds.
   *
   * @memberof Swipe
   */
  maxTime = 500;

  /**
   *
   *
   * @memberof Swipe
   */
  _swiped = new Signal();

  /**
   * The distance required to register a swipe.
   *
   * @memberof Swipe
   */
  _nMinSwipeDistance = 0;

  /**
   *
   *
   * @memberof Swipe
   */
  _startTime = 0;

  /**
   *
   *
   * @memberof Swipe
   */
  thresholdPercent = 0.1;

  /**
   *
   *
   * @memberof Swipe
   */
  elements:Array<HTMLElement> = [];

  /**
   *
   *
   * @memberof Swipe
   */
  started = false;

  /**
   * Creates an instance of Swipe.
   *
   * @param {*} [nThresholdPct=.1]
   * @memberof Swipe
   */
  constructor(nThresholdPct = 0.1) {
    this.thresholdPercent = nThresholdPct;
  }

  /**
   *
   *
   * @param {*} elements
   * @memberof Swipe
   */
  init = (elements:Array<HTMLElement>) => {
    this.update();

    this.elements = elements.concat();

    if (!Array.isArray(this.elements)) throw new Error("This is not an array.");

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
  };

  /**
   *
   *
   * @memberof Swipe
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
   *
   *
   * @param {*} e
   * @memberof Swipe
   */
  handleResize = () => {
    this.update();
  };

  /**
   *
   *
   * @memberof Swipe
   */
  update() {
    this._nMinSwipeDistance = Math.min(
      window.innerWidth / 4,
      Swipe.MIN_PIXEL_SWIPE_DIST
    );
  }

  /**
   *
   *
   * @param {*} evt
   * @returns
   * @memberof Swipe
   */
  handlePointerDown = (evt:Event) => {
    let pageXY;

    if (evt instanceof MouseEvent) {
      pageXY = new Point(evt.pageX, evt.pageY);
    } else if (evt instanceof TouchEvent) {
      pageXY = new Point(evt.touches[0].clientX, evt.touches[0].clientY);
    } else {
      throw new Error(
        "Event.page X/Y or Event.touches[0].client X/Y required."
      );
    }

    this._startCoords = new Point(pageXY.x, pageXY.y);
    this._startTime = Date.now();

    if (this.bDebug) console.log("START SWIPE");

    let success = false;

    this.elements.forEach((element) => {
      let targ = evt.target as HTMLElement; //Clicked element.
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

    if (!Sniffer.mobile) {
      evt.preventDefault();
    }
  };

  /**
   *
   *
   * @param {*} evt
   * @memberof Swipe
   */
  cancelMouseMove(_:Event | null) {
    this.elements.forEach((element) => {
      element.removeEventListener("mousemove", this.handlePointerMove);
      element.removeEventListener("touchmove", this.handlePointerMove);
    });
  }

  /**
   *
   *
   * @param {*} evt
   * @memberof Swipe
   */
  handlePointerUp = (evt:Event) => {
    this.cancelMouseMove(evt);
  };

  /**
   *
   *
   * @param {*} evt
   * @returns
   * @memberof Swipe
   */
  handlePointerMove = (evt:Event) => {
    if (!this.started) return;

    if (this._startCoords === null) {
      if (this.bDebug) console.log("END SWIPE - NO COORDS");
      return;
    }

    let pageXY;

    if (evt instanceof PointerEvent) {
      pageXY = new Point(evt.pageX, evt.pageY);
    } else if (evt instanceof TouchEvent) {
      pageXY = new Point(evt.touches[0].clientX, evt.touches[0].clientY);
    } else {
      throw new Error(
        "Event.page X/Y or Event.touches[0].client X/Y required."
      );
    }

    let now = Date.now();
    let swipeDistance = this._startCoords.dist(pageXY);

    if (swipeDistance > this._nMinSwipeDistance) {
      if (now - this._startTime < this.maxTime) {
        let angle = (this._swipeAngle =
          Math.atan2(
            pageXY.y - this._startCoords.y,
            pageXY.x - this._startCoords.x
          ) *
          (180 / Math.PI));
        if (isNaN(angle)) {
          if (this.bDebug) console.log("END SWIPE - NAN");
          return;
        }

        if (angle < -157.5 || angle > 157.5)
          this._swipeDirection = Swipe.SWIPE_LT;
        else if (angle < -112.5) this._swipeDirection = Swipe.SWIPE_UP_LT;
        else if (angle < -67.5) this._swipeDirection = Swipe.SWIPE_UP;
        else if (angle < -22.5) this._swipeDirection = Swipe.SWIPE_UP_RT;
        else if (angle < 22.5) this._swipeDirection = Swipe.SWIPE_RT;
        else if (angle < 67.5) this._swipeDirection = Swipe.SWIPE_DN_RT;
        else if (angle < 112.5) this._swipeDirection = Swipe.SWIPE_DN;
        else if (angle < 157.5) this._swipeDirection = Swipe.SWIPE_DN_LT;
        else throw new Error("Invalid angle: " + angle);

        if (this.bDebug) {
          console.log("END SWIPE - EMITTING: " + this._swipeDirection);
        }

        this.cancelMouseMove(evt);
        this.swiped.dispatch(this);
      } else {
        console.log("END SWIPE — TOOK TOO LONG");
      }
    } else if (this.bDebug) {
      console.log("END SWIPE - DISTANCE TOO SHORT: " + swipeDistance);
    }

    if (!Sniffer.mobile) {
      evt.preventDefault();
    }
  };
}
