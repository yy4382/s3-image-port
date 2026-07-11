import {
  Profiler,
  StrictMode,
  type PropsWithChildren,
  type ReactNode,
} from "react";

export function StrictModeTestWrapper({ children }: PropsWithChildren) {
  return <StrictMode>{children}</StrictMode>;
}

export function createRenderCounter() {
  let renders = 0;
  let commits = 0;

  function RenderCounter({ children }: { children?: ReactNode }) {
    renders++;
    return (
      <Profiler id="test-render-counter" onRender={() => commits++}>
        {children ?? null}
      </Profiler>
    );
  }

  return {
    RenderCounter,
    get renders() {
      return renders;
    },
    get commits() {
      return commits;
    },
  };
}

export function countSubscription(
  subscribe: (notify: () => void) => () => void,
) {
  let notifications = 0;
  let unsubscriptions = 0;
  let active = true;
  const cleanup = subscribe(() => notifications++);

  return {
    subscriptions: 1,
    get notifications() {
      return notifications;
    },
    get unsubscriptions() {
      return unsubscriptions;
    },
    unsubscribe() {
      if (!active) return;
      active = false;
      unsubscriptions++;
      cleanup();
    },
  };
}
