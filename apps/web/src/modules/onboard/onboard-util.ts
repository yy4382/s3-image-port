import { getRouteApi } from "@tanstack/react-router";
import { createContext, useCallback } from "react";
import z from "zod/v4";

export const TOTAL_STEPS = 5;
export const stepSchemaDisplay = z.int().min(1).max(TOTAL_STEPS);

const routeApi = getRouteApi("/$locale/onboard");
export const useStep = () => {
  const step = routeApi.useSearch().step;
  const navigate = routeApi.useNavigate();

  const setStep = useCallback(
    (step: number) => {
      const newStep = stepSchemaDisplay.safeParse(step);
      if (!newStep.success) {
        return;
      }
      navigate({
        to: "/$locale/onboard",
        search: (prev) => ({ ...prev, step: newStep.data }),
      });
    },
    [navigate],
  );

  const nextStep = useCallback(() => {
    if (step === TOTAL_STEPS) {
      return;
    }
    navigate({
      to: "/$locale/onboard",
      search: (prev) => ({ ...prev, step: step + 1 }),
    });
  }, [navigate, step]);

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
