import { SetStateAction } from "react";

import { useAtom, WritableAtom } from "jotai";
import { useValidateInput } from "@/lib/hooks/validate-input";
import { Dispatch } from "react";
import { Switch } from "@/components/animate-ui/radix/switch";
import z from "zod/v4";
import {
  FormEntryRoot,
  FormEntryTitle,
  FormEntryInput,
  FormEntryDescOrError,
} from "./form-entry";
import { Input } from "./input";

type SettingsTextEntryProps = {
  title: string;
  description?: string | React.ReactNode;
  schema: z.ZodType<string>;
  placeholder?: string;
  tooltipStyleDescription?: boolean;
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
};

export function FormEntryText({
  title,
  description,
  schema,
  placeholder,
  tooltipStyleDescription,
  value,
  setValue,
}: SettingsTextEntryProps) {
  const [error, handleChange] = useValidateInput(value, setValue, schema);
  return (
    <FormEntryRoot
      description={description}
      error={error}
      tooltipStyleDescription={tooltipStyleDescription}
    >
      <div className="grid">
        <FormEntryTitle className="mb-2">{title}</FormEntryTitle>
        <FormEntryInput>
          <Input
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
          />
        </FormEntryInput>
        <FormEntryDescOrError className="mt-1" />
      </div>
    </FormEntryRoot>
  );
}

export function FormEntrySwitch({
  title,
  description,
  value,
  setValue,
}: {
  title: string;
  description?: string | React.ReactNode;
  value: boolean;
  setValue: (value: SetStateAction<boolean>) => void;
}) {
  return (
    <FormEntryRoot description={description}>
      <div className="flex gap-2 items-center w-full justify-between">
        <div className="flex flex-col gap-1 flex-1">
          <FormEntryTitle>{title}</FormEntryTitle>
          <FormEntryDescOrError />
        </div>
        <FormEntryInput>
          <Switch
            checked={value}
            onCheckedChange={(checked) => setValue(checked)}
          />
        </FormEntryInput>
      </div>
    </FormEntryRoot>
  );
}

export function FormEntryTextAtom({
  atom,
  ...props
}: Omit<React.ComponentProps<typeof FormEntryText>, "value" | "setValue"> & {
  atom: WritableAtom<string, [SetStateAction<string>], void>;
}) {
  const [value, setValue] = useAtom(atom);
  return <FormEntryText {...props} value={value} setValue={setValue} />;
}

export function FormEntrySwitchAtom({
  atom,
  ...props
}: Omit<React.ComponentProps<typeof FormEntrySwitch>, "value" | "setValue"> & {
  atom: WritableAtom<boolean, [SetStateAction<boolean>], void>;
}) {
  const [value, setValue] = useAtom(atom);
  return <FormEntrySwitch {...props} value={value} setValue={setValue} />;
}
