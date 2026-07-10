export function createDeferred<T>() {
  let resolvePromise!: (value: T | PromiseLike<T>) => void;
  let rejectPromise!: (reason?: unknown) => void;
  let settled = false;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve(value: T | PromiseLike<T>) {
      settled = true;
      resolvePromise(value);
    },
    reject(reason?: unknown) {
      settled = true;
      rejectPromise(reason);
    },
    get settled() {
      return settled;
    },
  };
}

export function createStableIdGenerator(prefix = "test-id") {
  let nextId = 1;
  return () => `${prefix}-${nextId++}`;
}

export async function drainMicrotasks(count = 10) {
  for (let index = 0; index < count; index++) {
    await Promise.resolve();
  }
}

export async function settle({
  microtasks = 10,
  timers,
}: {
  microtasks?: number;
  timers?: () => void | Promise<void>;
} = {}) {
  await drainMicrotasks(microtasks);
  await timers?.();
  await drainMicrotasks(microtasks);
}
