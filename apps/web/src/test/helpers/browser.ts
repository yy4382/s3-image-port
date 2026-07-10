export function installResizeObserverControl() {
  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    "ResizeObserver",
  );

  class ControlledResizeObserver implements ResizeObserver {
    readonly observed: Element[] = [];
    readonly unobserved: Element[] = [];
    disconnects = 0;

    constructor(private readonly callback: ResizeObserverCallback) {
      instances.push(this);
    }

    observe(target: Element) {
      this.observed.push(target);
    }

    unobserve(target: Element) {
      this.unobserved.push(target);
    }

    disconnect() {
      this.disconnects++;
    }

    notify(entries: ResizeObserverEntry[] = []) {
      this.callback(entries, this);
    }
  }

  const instances: ControlledResizeObserver[] = [];
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ControlledResizeObserver,
  });

  return {
    instances,
    restore() {
      if (original) {
        Object.defineProperty(globalThis, "ResizeObserver", original);
      } else {
        Reflect.deleteProperty(globalThis, "ResizeObserver");
      }
    },
  };
}

export function installAnimationFrameControl() {
  const originalRequest = Object.getOwnPropertyDescriptor(
    globalThis,
    "requestAnimationFrame",
  );
  const originalCancel = Object.getOwnPropertyDescriptor(
    globalThis,
    "cancelAnimationFrame",
  );
  const callbacks = new Map<number, FrameRequestCallback>();
  const requested: number[] = [];
  const cancelled: number[] = [];
  let nextFrame = 1;

  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value(callback: FrameRequestCallback) {
      const frame = nextFrame++;
      requested.push(frame);
      callbacks.set(frame, callback);
      return frame;
    },
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value(frame: number) {
      cancelled.push(frame);
      callbacks.delete(frame);
    },
  });

  return {
    requested,
    cancelled,
    get pending() {
      return callbacks.size;
    },
    runNextFrame(timestamp = 0) {
      const entry = callbacks.entries().next().value;
      if (!entry) return false;
      const [frame, callback] = entry;
      callbacks.delete(frame);
      callback(timestamp);
      return true;
    },
    runAllFrames(timestamp = 0) {
      for (const [frame, callback] of [...callbacks]) {
        callbacks.delete(frame);
        callback(timestamp);
      }
    },
    restore() {
      if (originalRequest) {
        Object.defineProperty(
          globalThis,
          "requestAnimationFrame",
          originalRequest,
        );
      } else {
        Reflect.deleteProperty(globalThis, "requestAnimationFrame");
      }
      if (originalCancel) {
        Object.defineProperty(
          globalThis,
          "cancelAnimationFrame",
          originalCancel,
        );
      } else {
        Reflect.deleteProperty(globalThis, "cancelAnimationFrame");
      }
    },
  };
}
