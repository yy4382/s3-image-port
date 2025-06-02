"use client";

import { Suspense, useContext, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LanguageTheme } from "./language-theme";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ClientOnly } from "@/components/misc/client-only";
import { cn } from "@/lib/utils";
import useMeasure from "react-use-measure";
import { S3Onboard } from "./s3";
import { OnboardS3GetReady, OnboardS3GetReadyAction } from "./s3-get-ready";
import { StepContext, TOTAL_STEPS } from "./onboard-util";
import { useStep } from "./onboard-util";

function OnboardWrapper() {
  return (
    <Suspense>
      <ClientOnly>
        <Onboard />
      </ClientOnly>
    </Suspense>
  );
}
export { OnboardWrapper as Onboard };

function Onboard() {
  const [step, setStep, nextStep] = useStep(TOTAL_STEPS, "step");
  const [ref, bounds] = useMeasure();

  const mainContent = useMemo<{
    content: React.ReactNode;
    buttons?: React.ReactNode;
  }>(() => {
    switch (step) {
      case 0: {
        return { content: <OnboardWelcome /> };
      }
      case 1: {
        return {
          content: <OnboardS3GetReady />,
          buttons: <OnboardS3GetReadyAction />,
        };
      }
      case 2: {
        return { content: <S3Onboard /> };
      }
      case 3: {
        return { content: <div>Step 4</div> };
      }
      case 4: {
        return { content: <div>Step 5</div> };
      }
      default: {
        return { content: <div>&nbsp;</div> };
      }
    }
  }, [step]);

  if (step === null) {
    return <div>&nbsp;</div>;
  }
  return (
    <StepContext.Provider value={{ step, setStep, nextStep }}>
      <div className="flex flex-col h-full min-h-screen py-16 px-6 bg-background">
        <div className="flex-1 grid place-items-center">
          <MotionConfig
            transition={{ duration: 0.5, type: "spring", bounce: 0 }}
          >
            <motion.div
              className="border rounded-lg shadow w-150 overflow-hidden relative"
              animate={{
                height: bounds.height === 0 ? "auto" : bounds.height,
              }}
            >
              <div
                ref={ref}
                className="px-9 py-6 w-full flex flex-col gap-10 justify-between"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: (step ?? 0) > 0 ? "100%" : 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: "-100%" }}
                  >
                    {mainContent.content}
                  </motion.div>
                </AnimatePresence>
                <OnboardStep buttons={mainContent.buttons} />
              </div>
            </motion.div>
          </MotionConfig>
        </div>
      </div>
    </StepContext.Provider>
  );
}
function OnboardStep({ buttons }: { buttons?: React.ReactNode }) {
  const { step, setStep } = useContext(StepContext);
  return (
    <motion.div
      className={cn(
        "flex justify-between gap-6 items-center",
        step === null && "invisible",
      )}
      layout="position"
    >
      <div className="max-w-lg flex items-center gap-2 justify-between">
        {Array.from({ length: TOTAL_STEPS }).map((_, stepIndex) => (
          <div
            key={stepIndex}
            className={cn(
              "bg-muted-foreground/50 size-2 rounded-full transition-colors",
              step === stepIndex && "bg-primary",
            )}
          ></div>
        ))}
      </div>
      {buttons ?? (
        <Button onClick={() => setStep((step ?? 0) + 1)}>Continue</Button>
      )}
    </motion.div>
  );
}

function OnboardWelcome() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Welcome to S3 Image Port!</h2>
        <p className="text-muted-foreground">
          We&apos;ll help you set up your S3 bucket and configure your image
          port.
        </p>
      </div>
      <LanguageTheme />
    </div>
  );
}
