import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { settle } from "./deterministic";
import {
  StrictModeTestWrapper,
  createRenderCounter,
  countSubscription,
} from "./react";

describe("React reactivity test controls", () => {
  it("counts StrictMode renders and committed updates, then stays settled", async () => {
    const counter = createRenderCounter();
    const { rerender } = render(
      <StrictModeTestWrapper>
        <counter.RenderCounter>
          <span>first</span>
        </counter.RenderCounter>
      </StrictModeTestWrapper>,
    );

    expect(counter.renders).toBeGreaterThanOrEqual(2);
    expect(counter.commits).toBeGreaterThanOrEqual(1);

    rerender(
      <StrictModeTestWrapper>
        <counter.RenderCounter>
          <span>second</span>
        </counter.RenderCounter>
      </StrictModeTestWrapper>,
    );
    const settledCounts = {
      renders: counter.renders,
      commits: counter.commits,
    };

    await settle();
    expect({ renders: counter.renders, commits: counter.commits }).toEqual(
      settledCounts,
    );
  });

  it("counts notifications and unsubscribes exactly once", () => {
    const listeners = new Set<() => void>();
    const subscription = countSubscription((notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    });

    listeners.forEach((notify) => notify());
    listeners.forEach((notify) => notify());
    subscription.unsubscribe();
    subscription.unsubscribe();
    listeners.forEach((notify) => notify());

    expect(subscription.subscriptions).toBe(1);
    expect(subscription.notifications).toBe(2);
    expect(subscription.unsubscriptions).toBe(1);
    expect(listeners.size).toBe(0);
  });
});
