"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getTokenPreview } from "@/lib/encryption/sync-token";
import { cn } from "@/lib/utils";
import { useCopy } from "@/lib/hooks/use-copy";

interface TokenDisplayProps {
  token: string;
  showToggle?: boolean;
  showCopy?: boolean;
  defaultShowFull?: boolean;
  className?: string;
}

export function TokenDisplay({
  token,
  showToggle = true,
  showCopy = true,
  defaultShowFull = false,
  className = "",
}: TokenDisplayProps) {
  const [showFullToken, setShowFullToken] = useState(defaultShowFull);
  const [copied, setCopied] = useState(false);
  const { copyAsync } = useCopy();

  const handleCopy = async () => {
    await copyAsync(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayToken = showFullToken ? token : getTokenPreview(token);

  return (
    <div className={cn("relative", className)}>
      <div className="p-4 rounded-lg border bg-muted/50 pr-20">
        <p className="font-mono text-sm wrap-break-word">{displayToken}</p>
      </div>
      <div className="absolute inset-y-0 end-0 flex items-center gap-1 px-2">
        {showToggle && (
          <motion.button
            type="button"
            onClick={() => setShowFullToken(!showFullToken)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={showFullToken ? "Hide token" : "Show full token"}
            aria-pressed={showFullToken}
            whileHover={{
              scale: 1.1,
            }}
            whileTap={{
              scale: 0.9,
            }}
          >
            <AnimatePresence mode="popLayout">
              {showFullToken ? (
                <motion.span
                  key="eye-off"
                  initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
                </motion.span>
              ) : (
                <motion.span
                  key="eye"
                  initial={{ opacity: 0, rotate: 90, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -90, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Eye size={16} strokeWidth={2} aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
        {showCopy && (
          <motion.button
            type="button"
            onClick={handleCopy}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Copy token"
            whileHover={{
              scale: 1.1,
            }}
            whileTap={{
              scale: 0.9,
            }}
          >
            <AnimatePresence mode="popLayout">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <CheckCircle2
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="text-green-600"
                  />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Copy size={16} strokeWidth={2} aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>
    </div>
  );
}
