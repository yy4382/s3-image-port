import { focusAtom } from "jotai-optics";
import { KeyTemplatePreset, uploadSettingsAtom } from "../../settings-store";
import { splitAtom } from "jotai/utils";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { useKeyTemplateValidation } from "./field-validate";
import {
  atom,
  PrimitiveAtom,
  SetStateAction,
  useAtom,
  useSetAtom,
} from "jotai";
import { ComponentPropsWithoutRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { defaultKeyTemplate } from "@/lib/s3/s3-key";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import {
  CheckIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCcw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { v7 as uuidV7 } from "uuid";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const keyTemplateAtom = focusAtom(uploadSettingsAtom, (optic) =>
  optic.prop("keyTemplate"),
);
const keyTemplatePresetsAtom0 = focusAtom(uploadSettingsAtom, (optic) => {
  return optic.prop("keyTemplatePresets");
});
const keyTemplatePresetsAtom = atom(
  (get) => get(keyTemplatePresetsAtom0) ?? [],
  (_, set, update: SetStateAction<KeyTemplatePreset[]>) => {
    set(keyTemplatePresetsAtom0, (prev) => {
      if (typeof update === "function") {
        return update(prev ?? []);
      }
      return update;
    });
  },
);

const presetAtomsAtom = splitAtom(keyTemplatePresetsAtom, (item) => item.key);

export function KeyTemplateSettingsInput() {
  const t = useTranslations("settings.keyTemplate");
  return (
    <FieldSet>
      <FieldLegend>{t("title")}</FieldLegend>
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
      <DefaultKeyTemplateInput />
      <PresetList />
    </FieldSet>
  );
}

function DefaultKeyTemplateInput() {
  const [keyTemplate, setKeyTemplate] = useAtom(keyTemplateAtom);
  const { error, warning, validate } = useKeyTemplateValidation();
  const t = useTranslations("settings.keyTemplate");
  return (
    <Field className="gap-1" data-invalid={error !== undefined}>
      <FieldLabel htmlFor="default-key-template-input">
        {t("defaultKeyTemplate")}
      </FieldLabel>
      <KeyTemplateInputWithReset
        value={keyTemplate}
        onChange={(value) => {
          setKeyTemplate(value);
          validate(value);
        }}
        inputProps={{
          id: "default-key-template-input",
          "aria-invalid": !!error,
        }}
      />
      <FieldDescription className="nth-last-2:mt-0">
        {t("defaultKeyTemplateDesc")}
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

function KeyTemplateInputWithReset(props: {
  value: string;
  onChange: (value: string) => void;
  inputProps?: ComponentPropsWithoutRef<typeof Input>;
}) {
  const { value, onChange } = props;
  return (
    <div className="relative">
      <Input
        {...props.inputProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <motion.button
        type="button"
        onClick={() => onChange(defaultKeyTemplate)}
        className={cn(
          "absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          value === defaultKeyTemplate && "hidden",
        )}
        aria-label="Reset to default"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <RefreshCcw size={16} strokeWidth={2} aria-hidden="true" />
      </motion.button>
    </div>
  );
}

function PresetList() {
  const [presetAtoms, dispatch] = useAtom(presetAtomsAtom);
  const setDefaultTemplate = useSetAtom(keyTemplateAtom);
  const t = useTranslations("settings.keyTemplate");

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("presets.title")}</TableHead>
            <TableHead className="text-right">{t("presets.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <Badge data-testid="system-preset-badge">
                {t("systemBadge")}
              </Badge>{" "}
              <span className="text-wrap break-all">{defaultKeyTemplate}</span>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="System preset actions"
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => setDefaultTemplate(defaultKeyTemplate)}
                    >
                      {t("presets.applyAsDefault")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
          {presetAtoms.map((itemAtom) => (
            <PresetItem
              key={itemAtom.toString()}
              item={itemAtom}
              remove={() => dispatch({ type: "remove", atom: itemAtom })}
            />
          ))}
          <TableRow>
            <TableCell colSpan={2} className="text-right">
              <Button
                variant="ghost"
                onClick={() => {
                  dispatch({
                    type: "insert",
                    value: { key: uuidV7(), value: defaultKeyTemplate },
                  });
                }}
                size="sm"
              >
                <PlusIcon />
                {t("presets.addNew")}
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function PresetItem({
  item,
  remove,
}: {
  item: PrimitiveAtom<KeyTemplatePreset>;
  remove: () => void;
}) {
  const [preset, setPreset] = useAtom(item);
  const setDefaultTemplate = useSetAtom(keyTemplateAtom);
  const [isEditing, setIsEditing] = useState(false);
  const { error, warning, validate } = useKeyTemplateValidation();
  const t = useTranslations("settings.keyTemplate");
  return (
    <TableRow data-testid={`preset-user-defined-item-${preset.key}`}>
      <TableCell>
        {isEditing ? (
          <Field>
            <KeyTemplateInputWithReset
              value={preset.value}
              onChange={(value) => {
                setPreset((prev) => ({ ...prev, value }));
                validate(value);
              }}
            />
            {error && <FieldError errors={error} />}
            {warning && (
              <FieldError
                errors={[{ message: warning }]}
                className="text-orange-500"
              />
            )}
          </Field>
        ) : (
          <span title={`id: ${preset.key}`} className="text-wrap break-all">
            {preset.value}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isEditing ? (
          <Button
            size="icon-sm"
            onClick={() => setIsEditing(false)}
            disabled={!!error}
            aria-label="Save"
          >
            <CheckIcon />
          </Button>
        ) : (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  {t("presets.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDefaultTemplate(preset.value)}
                >
                  {t("presets.applyAsDefault")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => remove()}
                  className="text-destructive"
                >
                  {t("presets.delete")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}
