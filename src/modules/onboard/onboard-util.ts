import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useEffect, useState } from "react";

export const TOTAL_STEPS = 5;

export const useStep = (totalSteps: number, searchParamKey: string) => {
  const [step, setStepRaw] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const step = parseInt(searchParams.get(searchParamKey) ?? "1");
    setStepRaw(step - 1);
  }, [searchParamKey, searchParams]);

  const setStep = useCallback(
    (step: number) => {
      if (step < 0 || step >= totalSteps) {
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
