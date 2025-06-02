import { Label } from "./label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/animate-ui/radix/tooltip";

export function FormEntry({
  id,
  title,
  description,
  tooltipStyleDescription,
  error,
  children,
}: React.PropsWithChildren<{
  id: string;
  title: string;
  description?: string | React.ReactNode;
  tooltipStyleDescription?: boolean;
  error?: string;
}>) {
  const useTooltip = description && tooltipStyleDescription;
  const bottomDescription = description && !tooltipStyleDescription && !error;
  const bottomError = !!error;

  return (
    <div className="grid">
      {useTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Label
                htmlFor={id}
                className="data-[error=true]:text-destructive w-fit mb-2"
                data-error={!!error}
              >
                {title}
              </Label>
            </TooltipTrigger>
            <TooltipContent>
              <p>{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Label
          htmlFor={id}
          className="data-[error=true]:text-destructive w-fit mb-2"
          data-error={!!error}
        >
          {title}
        </Label>
      )}
      {children}
      {bottomError && <p className="text-destructive text-sm mt-1">{error}</p>}
      {bottomDescription && (
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      )}
    </div>
  );
}
