import { useId, useState } from "react";
import * as z from "zod";
import { FormEntry } from "../ui/formEntry";
import { Input } from "../ui/input";

export const keyTemplateSchema = z
  .string()
  .min(1, "Key template cannot be empty");

export function KeyTemplate({
  v,
  set,
}: {
  v: string;
  set: (a: string) => void;
}) {
  const [error, setError] = useState<string | undefined>(undefined);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    set(value);
    const result = keyTemplateSchema.safeParse(value);
    if (result.success) {
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };
  const id = useId();
  return (
    <FormEntry
      id={id}
      title="Key Template"
      description="Template for the S3 key. Use {{filename}} to insert the original filename."
      error={error}
    >
      <Input id={id} value={v} onChange={handleChange} />
    </FormEntry>
  );
}
