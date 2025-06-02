import { SetStateAction, useAtom, WritableAtom } from "jotai";
import { useState } from "react";
import z from "zod/v4";

export function useValidateInputAtom<T>(
  atom: WritableAtom<T, [SetStateAction<T>], void>,
  schema: z.ZodType<T>,
) {
  const [value, setValue] = useAtom(atom);
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

  return [value, error, handleChange] as const;
}
