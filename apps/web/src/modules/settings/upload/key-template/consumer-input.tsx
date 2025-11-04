import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { defaultKeyTemplate } from "@/lib/utils/generateKey";
import { ChevronDownIcon } from "lucide-react";
import { Autocomplete } from "@base-ui-components/react/autocomplete";
import {
  KeyTemplateFieldInputProps,
  useKeyTemplateValidation,
} from "./field-validate";
import { KeyTemplatePreset } from "../../settings-store";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { useTranslations } from "use-intl";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
type KeyTemplateConsumerInputProps = KeyTemplateFieldInputProps & {
  presets: KeyTemplatePreset[];
};

export function KeyTemplateConsumerInput(props: KeyTemplateConsumerInputProps) {
  const { value, onChange } = props;
  const t = useTranslations("settings.keyTemplate");
  const { error, warning, validate } = useKeyTemplateValidation();
  return (
    <Field data-invalid={error !== undefined} className="gap-1">
      <FieldLabel>{t("title")}</FieldLabel>
      <KeyTemplateInputWithPresetsAutoComplete
        {...props}
        value={value}
        onChange={(value) => {
          validate(value);
          onChange(value);
        }}
      />
      <FieldDescription>
        {t.rich("description", {
          more: (chunks) => (
            <Link
              from="/$locale"
              to="/$locale/docs/$"
              params={({ locale }) => ({
                locale,
                _splat: "settings-reference",
              })}
              hash="key-template"
              target="_blank"
              className="underline underline-offset-1"
            >
              {chunks}
            </Link>
          ),
        })}
      </FieldDescription>
      {error && <FieldError errors={error} />}
      {warning && (
        <FieldError
          errors={[{ message: warning }]}
          className="text-orange-500"
        />
      )}
    </Field>
  );
}

function KeyTemplateWithPresetsAutoComplete(
  props: KeyTemplateConsumerInputProps & { className?: string },
) {
  const t = useTranslations("settings.keyTemplate");
  return (
    <Autocomplete.Root>
      <Autocomplete.Trigger className={props.className}>
        <ChevronDownIcon className="size-4" />
      </Autocomplete.Trigger>
      <Autocomplete.Portal>
        <Autocomplete.Positioner align="end" sideOffset={6} className="z-60">
          <Autocomplete.Popup className="max-h-[min(var(--available-height),23rem)] max-w-(--available-width) p-2 overflow-y-auto scroll-pt-2 scroll-pb-2 overscroll-contain rounded-md bg-popover text-popover-foreground shadow-md outline-1 outline-border dark:shadow-none origin-(--transform-origin) transition-[transform,scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-[side=none]:data-ending-style:transition-none data-starting-style:scale-95 data-starting-style:opacity-0 data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-starting-style:opacity-100 data-[side=none]:data-starting-style:transition-none">
            <Autocomplete.List>
              <Autocomplete.Item
                className="py-1.5 px-3 text-sm rounded-md data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                value={defaultKeyTemplate}
                onClick={() => props.onChange(defaultKeyTemplate)}
              >
                <Badge>{t("systemBadge")}</Badge> {defaultKeyTemplate}
              </Autocomplete.Item>
              {props.presets.map(({ key, value }) => (
                <Autocomplete.Item
                  className="py-1.5 px-3 text-sm rounded-md data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  key={key}
                  value={value}
                  onClick={() => props.onChange(value)}
                >
                  {value}
                </Autocomplete.Item>
              ))}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}

function KeyTemplateInputWithPresetsAutoComplete(
  props: KeyTemplateConsumerInputProps,
) {
  const { value, onChange } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative w-full max-w-80 sm:max-w-[unset]">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        ref={inputRef}
      />
      <KeyTemplateWithPresetsAutoComplete
        {...props}
        onChange={(value) => {
          props.onChange(value);
          inputRef.current?.focus();
        }}
        className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
