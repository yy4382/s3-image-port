import { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { z } from "zod";

export function useValidateInput<T>(
  value: T,
  setValue: Dispatch<SetStateAction<T>>,
  schema: z.ZodType<T>,
) {
  const [error, setError] = useState<string | undefined>(undefined);

  const handleChange = (value: T) => {
    setValue(value);
    const result = schema.safeParse(value);
    if (result.success) {
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };

  return [error, handleChange] as const;
}
