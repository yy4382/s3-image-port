import { Label } from "./label";

export function FormEntry({
  id,
  title,
  description,
  error,
  children,
}: React.PropsWithChildren<{
  id: string;
  title: string;
  description: string;
  error?: string;
}>) {
  return (
    <div className="grid gap-2">
      <Label
        htmlFor={id}
        className="data-[error=true]:text-destructive"
        data-error={!!error}
      >
        {title}
      </Label>
      {children}
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
    </div>
  );
}
