import { act, render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { IntlProvider } from "use-intl";
import { describe, expect, it } from "vitest";

import en from "@/../messages/en.json";
import {
  installAnimationFrameControl,
  installResizeObserverControl,
} from "@/test/helpers/browser";
import { settle } from "@/test/helpers/deterministic";
import { StrictModeTestWrapper } from "@/test/helpers/react";

import { containerWidthAtom } from "../hooks/use-calculate-layout";
import { PhotoGrid } from "./PhotoGrid";

describe("PhotoGrid measurement lifecycle", () => {
  it("cancels its initial measurement when unmounted before the frame", async () => {
    const observers = installResizeObserverControl();
    const frames = installAnimationFrameControl();
    const store = createStore();
    let widthNotifications = 0;
    const unsubscribe = store.sub(containerWidthAtom, () => {
      widthNotifications++;
    });

    try {
      const mounted = render(
        <IntlProvider locale="en" messages={en}>
          <Provider store={store}>
            <PhotoGrid />
          </Provider>
        </IntlProvider>,
      );

      const widthAtUnmount = store.get(containerWidthAtom);
      mounted.unmount();
      const notificationsAtUnmount = widthNotifications;

      frames.runAllFrames();
      await settle();

      expect(frames.requested).toHaveLength(1);
      expect(frames.cancelled).toEqual(frames.requested);
      expect(frames.pending).toBe(0);
      expect(observers.instances).toHaveLength(1);
      expect(observers.instances[0].disconnects).toBe(1);
      expect(store.get(containerWidthAtom)).toBe(widthAtUnmount);
      expect(widthNotifications).toBe(notificationsAtUnmount);
    } finally {
      unsubscribe();
      frames.restore();
      observers.restore();
    }
  });

  it("keeps the measured width and releases resources after the frame", async () => {
    const observers = installResizeObserverControl();
    const frames = installAnimationFrameControl();
    const store = createStore();
    let widthNotifications = 0;
    const unsubscribe = store.sub(containerWidthAtom, () => {
      widthNotifications++;
    });

    try {
      const mounted = render(
        <IntlProvider locale="en" messages={en}>
          <Provider store={store}>
            <PhotoGrid />
          </Provider>
        </IntlProvider>,
      );
      const container = mounted.container.firstElementChild;
      if (!container) {
        throw new Error("PhotoGrid did not render its measurement container");
      }
      Object.defineProperty(container, "clientWidth", {
        configurable: true,
        value: 480,
      });

      act(() => {
        expect(frames.runNextFrame()).toBe(true);
      });

      expect(store.get(containerWidthAtom)).toBe(480);
      expect(widthNotifications).toBe(1);
      mounted.unmount();
      const notificationsAtUnmount = widthNotifications;

      frames.runAllFrames();
      await settle();

      expect(frames.requested).toHaveLength(1);
      expect(frames.cancelled).toEqual(frames.requested);
      expect(frames.pending).toBe(0);
      expect(observers.instances).toHaveLength(1);
      expect(observers.instances[0].disconnects).toBe(1);
      expect(store.get(containerWidthAtom)).toBe(480);
      expect(widthNotifications).toBe(notificationsAtUnmount);
    } finally {
      unsubscribe();
      frames.restore();
      observers.restore();
    }
  });

  it("leaves no observer or frame alive through StrictMode replay", async () => {
    const observers = installResizeObserverControl();
    const frames = installAnimationFrameControl();
    const store = createStore();
    let widthNotifications = 0;
    const unsubscribe = store.sub(containerWidthAtom, () => {
      widthNotifications++;
    });

    try {
      const mounted = render(
        <StrictModeTestWrapper>
          <IntlProvider locale="en" messages={en}>
            <Provider store={store}>
              <PhotoGrid />
            </Provider>
          </IntlProvider>
        </StrictModeTestWrapper>,
      );

      expect(observers.instances.length).toBeGreaterThanOrEqual(1);
      expect(frames.requested).toHaveLength(observers.instances.length);
      expect(frames.cancelled).toHaveLength(observers.instances.length - 1);
      expect(frames.pending).toBe(1);

      mounted.unmount();
      const widthAtUnmount = store.get(containerWidthAtom);
      const notificationsAtUnmount = widthNotifications;
      frames.runAllFrames();
      await settle();

      expect(
        observers.instances.map((observer) => observer.disconnects),
      ).toEqual(observers.instances.map(() => 1));
      expect(frames.cancelled).toEqual(frames.requested);
      expect(frames.pending).toBe(0);
      expect(store.get(containerWidthAtom)).toBe(widthAtUnmount);
      expect(widthNotifications).toBe(notificationsAtUnmount);
    } finally {
      unsubscribe();
      frames.restore();
      observers.restore();
    }
  });
});
