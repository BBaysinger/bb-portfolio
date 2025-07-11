type Callback = (now: number) => void;

interface Subscriber {
  callback: Callback;
  fps: number;
  lastTime: number;
}

class FrameSync {
  private subscribers = new Set<Subscriber>();
  private rafId: number | null = null;

  /**
   * Subscribes a callback to be invoked at a specific fps, synchronized with a global RAF loop.
   * @param callback - The function to invoke when due.
   * @param fps - Frames per second for throttling this callback.
   * @returns A function to unsubscribe the callback.
   */
  subscribe(callback: Callback, fps: number): () => void {
    const subscriber: Subscriber = {
      callback,
      fps,
      lastTime: performance.now(),
    };

    this.subscribers.add(subscriber);

    if (this.subscribers.size === 1) {
      this.startLoop();
    }

    return () => this.unsubscribe(callback);
  }

  /**
   * Unsubscribes a previously registered callback.
   * If no subscribers remain, the RAF loop is cancelled.
   * @param callback - The callback to remove.
   */
  private unsubscribe(callback: Callback) {
    for (const sub of this.subscribers) {
      if (sub.callback === callback) {
        this.subscribers.delete(sub);
        break;
      }
    }

    if (this.subscribers.size === 0 && this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Starts the global RAF loop and throttles individual callbacks.
   */
  private startLoop() {
    const tick = (now: number) => {
      for (const sub of this.subscribers) {
        const interval = 1000 / sub.fps;
        if (now - sub.lastTime >= interval) {
          sub.lastTime = now;
          sub.callback(now);
        }
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }
}

export const frameSync = new FrameSync();
