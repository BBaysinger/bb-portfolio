type OnCompleteCallback = () => void;

class SmoothEaser<T> {
  private static instances: Set<SmoothEaser<any>> = new Set();
  private static isLoopRunning: boolean = false;

  private obj: T;
  private property: keyof T;
  private start: number;
  private target: number;
  private velocity: number;
  private accel: number;
  private k: number; // stiffness
  private m: number; // mass
  private decay: number; // damping
  private onComplete?: OnCompleteCallback;
  private _done: boolean;

  public get done(): boolean {
    return this._done;
  }

  constructor(
    obj: T,
    property: keyof T,
    start: number,
    target: number,
    onComplete?: OnCompleteCallback,
  ) {
    this.obj = obj;
    this.property = property;
    this.start = start;
    this.target = target;
    this.velocity = 0;
    this.accel = 0;
    this.k = 2; // stiffness
    this.m = 10; // mass
    this.decay = 0.1; // damping
    this.onComplete = onComplete;
    this._done = false;

    (this.obj[this.property] as unknown as number) = this.start;

    // Register this instance for the static loop
    SmoothEaser.instances.add(this);
    SmoothEaser.startLoop();
  }

  update(): void {
    if (this._done) return;

    this.accel = -(this.k / this.m) * (this.start - this.target);
    this.velocity *= this.decay;
    this.velocity += this.accel;
    this.start += this.velocity;
    (this.obj[this.property] as unknown as number) = this.start;

    if (
      Math.abs(this.target - this.start) < 0.1 &&
      Math.abs(this.velocity) < 0.01
    ) {
      this._done = true;
      (this.obj[this.property] as unknown as number) = this.target;
      if (this.onComplete) this.onComplete();
      // Remove completed instances
      SmoothEaser.instances.delete(this);
    }
  }

  setTarget(newTarget: number): void {
    this.target = newTarget;
    this._done = false;
    SmoothEaser.instances.add(this); // Ensure it's in the loop
  }

  private static startLoop(): void {
    if (this.isLoopRunning) return;

    this.isLoopRunning = true;
    const loop = () => {
      if (this.instances.size === 0) {
        this.isLoopRunning = false;
        return; // Stop loop if no active instances
      }

      this.instances.forEach((instance) => instance.update());
      requestAnimationFrame(loop); // Schedule next update
    };

    requestAnimationFrame(loop);
  }
}

export default SmoothEaser;
