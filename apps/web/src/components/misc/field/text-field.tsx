import { useFieldContext } from "./field-context";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ComponentProps, useId } from "react";

export function TextField({
  label,
  description,
  ...props
}: ComponentProps<typeof Input> & {
  label: string;
  description: string | React.ReactNode;
}) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const id = useId();
  return (
    <Field data-invalid={isInvalid} className="gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        {...props}
      />
      <FieldDescription>{description}</FieldDescription>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
