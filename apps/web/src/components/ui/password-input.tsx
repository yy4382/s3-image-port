import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "./input";
import { AnimatePresence, motion } from "motion/react";

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input type={showPassword ? "text" : "password"} {...props} />
      <motion.button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        whileHover={{
          scale: 1.1,
        }}
        whileTap={{
          scale: 0.9,
        }}
      >
        <AnimatePresence mode="popLayout">
          {showPassword ? (
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
    </div>
  );
}
