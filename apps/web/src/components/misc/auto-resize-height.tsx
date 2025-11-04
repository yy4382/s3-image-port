import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimateChangeInHeightProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

/**
 * A component that automatically adjusts its height based on the content inside it,
 * with smooth transitions when the height changes.
 *
 * Caveats:
 * - The content inside should not use `margin-top` or `margin-bottom`, as this can interfere with height calculations.
 */
export const AutoResizeHeight: React.FC<AnimateChangeInHeightProps> = ({
  children,
  className,
  duration = 0.6,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const observedHeight = entries[0].contentRect.height;
        setHeight(observedHeight);
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <motion.div
      className={cn("overflow-hidden", className)}
      style={{ height }}
      initial={false}
      animate={{ height }}
      transition={{ duration, ease: "easeOut" }}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};
