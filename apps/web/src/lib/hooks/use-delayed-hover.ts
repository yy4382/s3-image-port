// useDelayedHover.ts
import { useEffect, useRef, useState, useCallback } from "react";

export function useDelayedHover(
  isHovering: boolean,
  delay = 100,
  onHoverDelay?: () => void,
): boolean {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [delayedHover, setDelayedHover] = useState(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isHovering) {
      timerRef.current = setTimeout(() => {
        setDelayedHover(true);
        onHoverDelay?.();
      }, delay);
    } else {
      clear();
      setDelayedHover(false);
    }

    return () => clear();
  }, [isHovering, delay, onHoverDelay, clear]);

  return delayedHover;
}
