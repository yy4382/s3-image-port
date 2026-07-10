import { render } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { describe, expect, it } from "vitest";

import { settle } from "./deterministic";
import {
  installAnimationFrameControl,
  installResizeObserverControl,
} from "./browser";
import { StrictModeTestWrapper } from "./react";

describe("browser lifecycle test controls", () => {
  it("makes observer and animation-frame cleanup observable", async () => {
    const observers = installResizeObserverControl();
    const frames = installAnimationFrameControl();

    function MeasuredStoredImage() {
      const element = useRef<HTMLDivElement>(null);
      useEffect(() => {
        const observer = new ResizeObserver(() => {});
        observer.observe(element.current!);
        const frame = requestAnimationFrame(() => {});
        return () => {
          observer.disconnect();
          cancelAnimationFrame(frame);
        };
      }, []);
      return <div ref={element}>stored image</div>;
    }

    try {
      const mounted = render(
        <StrictModeTestWrapper>
          <MeasuredStoredImage />
        </StrictModeTestWrapper>,
      );

      expect(observers.instances.length).toBeGreaterThanOrEqual(1);
      expect(frames.pending).toBe(1);

      mounted.unmount();
      const settledCounts = {
        observers: observers.instances.length,
        requested: frames.requested.length,
        cancelled: frames.cancelled.length,
      };
      await settle();

      expect(
        observers.instances.every((observer) => observer.disconnects === 1),
      ).toBe(true);
      expect(frames.pending).toBe(0);
      expect(frames.cancelled).toHaveLength(frames.requested.length);
      expect({
        observers: observers.instances.length,
        requested: frames.requested.length,
        cancelled: frames.cancelled.length,
      }).toEqual(settledCounts);
    } finally {
      frames.restore();
      observers.restore();
    }
  });
});
