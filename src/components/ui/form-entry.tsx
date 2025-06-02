import { createContext, useContext, useId } from "react";
import { Label } from "./label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/animate-ui/radix/tooltip";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const formEntryContext = createContext<{
  id: string;
  error?: string | React.ReactNode;
  description?: string | React.ReactNode;
  tooltipStyleDescription?: boolean;
}>({
  id: "",
  tooltipStyleDescription: false,
});

export function FormEntryRoot({
  description,
  error,
  tooltipStyleDescription,
  children,
}: {
  description?: string | React.ReactNode;
  error?: string | React.ReactNode;
  tooltipStyleDescription?: boolean;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <formEntryContext.Provider
      value={{ id, description, error, tooltipStyleDescription }}
    >
      {children}
    </formEntryContext.Provider>
  );
}

export function FormEntryTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { id, description, tooltipStyleDescription, error } =
    useContext(formEntryContext);
  const useTooltip = description && tooltipStyleDescription;
  const label = (
    <Label
      htmlFor={id}
      className={cn("data-[error=true]:text-destructive w-fit", className)}
      data-error={!!error}
    >
      {children}
    </Label>
  );
  return useTooltip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{label}</TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    label
  );
}

export function FormEntryInput({ children }: { children: React.ReactNode }) {
  const { id } = useContext(formEntryContext);
  return <Slot id={id}>{children}</Slot>;
}

export function FormEntryDescOrError({ className }: { className?: string }) {
  const { description, error, tooltipStyleDescription } =
    useContext(formEntryContext);
  const bottomDescription = description && !error && !tooltipStyleDescription;
  const bottomError = !!error;

  return (
    <>
      {bottomDescription && (
        <p className={cn("text-muted-foreground text-sm", className)}>
          {description}
        </p>
      )}
      {bottomError && (
        <p className={cn("text-destructive text-sm", className)}>{error}</p>
      )}
    </>
  );
}
