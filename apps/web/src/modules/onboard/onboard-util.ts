import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useEffect, useState } from "react";

export const TOTAL_STEPS = 5;

export const useStep = (totalSteps: number, searchParamKey: string) => {
  const [step, setStepRaw] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const stepParam = searchParams.get(searchParamKey) ?? "1";
    const step = parseInt(stepParam);
    // Handle NaN case by defaulting to step 1 (index 0)
    const validStep = isNaN(step) ? 1 : step;
    setStepRaw(validStep - 1);
  }, [searchParamKey, searchParams]);

  const setStep = useCallback(
    (step: number) => {
      // Handle NaN values by returning early
      if (isNaN(step) || step < 0 || step >= totalSteps) {
        return;
      }
      setStepRaw(step);
      const params = new URLSearchParams(searchParams);
      params.set(searchParamKey, (step + 1).toString());
      router.push(`?${params.toString()}`);
    },
    [searchParamKey, searchParams, router, totalSteps],
  );

  const nextStep = useCallback(() => {
    setStep((step ?? 0) + 1);
  }, [setStep, step]);

  return [step, setStep, nextStep] as const;
};

export const StepContext = createContext<{
  step: number | null;
  setStep: (step: number) => void;
  nextStep: () => void;
}>({
  step: null,
  setStep: () => {},
  nextStep: () => {},
});
