import { PasswordInput } from "@/components/ui/password-input";
import { ComponentProps, useId } from "react";
import { useFieldContext } from "./field-context";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

export function PasswordField({
  label,
  description,
  ...props
}: ComponentProps<typeof PasswordInput> & {
  label: string;
  description: string | React.ReactNode;
}) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const id = useId();
  return (
    <Field data-invalid={isInvalid} className="gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <PasswordInput
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
