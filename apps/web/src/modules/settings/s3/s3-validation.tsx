"use client";

import { getAllowedMethods, testS3Settings } from "@/lib/utils/testS3Settings";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent as UIDialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { s3SettingsAtom, s3SettingsSchema } from "../settings-store";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Check,
  X,
} from "lucide-react";
import { useTranslations } from "use-intl";

export type ValidationStatus =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; allowedMethods: string[] }
  | { status: "failed" }
  | {
      status: "cors-incomplete";
      allowedMethods: string[];
      missingMethods: string[];
    };

interface StatusIconProps {
  status: ValidationStatus["status"];
}

// 简洁的状态图标
function StatusIcon({ status }: StatusIconProps) {
  switch (status) {
    case "testing":
      return <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />;
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "cors-incomplete":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    default:
      return null;
  }
}

// 简短状态文本
function StatusText({ status }: { status: ValidationStatus["status"] }) {
  const t = useTranslations("settings.s3Validation.status");

  switch (status) {
    case "testing":
      return null;
    case "success":
      return <span className="text-sm text-gray-600">{t("valid")}</span>;
    case "failed":
      return <span className="text-sm text-gray-600">{t("checkConfig")}</span>;
    case "cors-incomplete":
      return <span className="text-sm text-gray-600">{t("corsNeeded")}</span>;
    default:
      return null;
  }
}

// CORS方法状态标记
function MethodBadge({
  method,
  isAllowed,
}: {
  method: string;
  isAllowed: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {isAllowed ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <X className="h-3 w-3 text-red-600" />
      )}
      <span className="font-mono text-gray-600">{method}</span>
    </div>
  );
}

// Dialog内容
function DialogContent({
  validationStatus,
}: {
  validationStatus: ValidationStatus;
}) {
  const t = useTranslations("settings.s3Validation");
  const requiredMethods = ["GET", "HEAD", "PUT", "POST", "DELETE"];

  if (validationStatus.status === "failed") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {t("messages.connectionFailed")}
        </p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>{t("checklist.allFieldsFilled")}</li>
          <li>{t("checklist.endpointCorrect")}</li>
          <li>{t("checklist.credentialsValid")}</li>
          <li>{t("checklist.bucketValid")}</li>
          <li>{t("checklist.corsConfigured")}</li>
        </ul>
      </div>
    );
  }

  if (validationStatus.status === "cors-incomplete") {
    return (
      <div className="space-y-4">
        <p
          className="text-muted-foreground"
          // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
          dangerouslySetInnerHTML={{
            __html: `✅ ${t("messages.settingsCorrect")}`,
          }}
        />

        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground">
            {t("messages.corsPermissionsNeeded")}
          </p>

          <p className="">
            <span className="font-mono text-red-600">
              {validationStatus.missingMethods.join(", ")}
            </span>
          </p>
        </div>

        <hr className="my-2" />

        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm text-muted-foreground">
            {t("messages.statusLabel")}
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {requiredMethods.map((method) => {
              const isAllowed =
                validationStatus.allowedMethods.includes(method);
              return (
                <MethodBadge
                  key={method}
                  method={method}
                  isAllowed={isAllowed}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// 获取Dialog标题
function getDialogTitle(
  status: ValidationStatus["status"],
  t: ReturnType<typeof useTranslations>,
) {
  switch (status) {
    case "failed":
      return t("dialog.configurationIssue");
    case "cors-incomplete":
      return t("dialog.corsSetupRequired");
    default:
      return t("dialog.details");
  }
}

// 紧凑测试按钮
function TestButton({
  onTest,
  isLoading,
  disabled,
}: {
  onTest: () => void;
  isLoading: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("settings.s3Validation");

  return (
    <Button
      onClick={onTest}
      disabled={isLoading || disabled}
      size="sm"
      variant="outline"
      className="text-xs h-7 px-3"
    >
      {isLoading ? t("status.testing") : t("testButton")}
    </Button>
  );
}

// S3验证主组件
export function S3Validation() {
  const t = useTranslations("settings.s3Validation");
  const s3Settings = useAtomValue(s3SettingsAtom);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    status: "idle",
  });

  const requiredMethods = ["GET", "HEAD", "PUT", "POST", "DELETE"];

  // 检查schema是否有效
  const isSchemaValid = s3SettingsSchema.safeParse(s3Settings).success;

  async function validate() {
    setValidationStatus({ status: "testing" });

    try {
      const result = await testS3Settings(s3Settings, window.location.origin);

      if (result.valid === false) {
        if (result.type === "no-result") {
          setValidationStatus({ status: "failed" });
        } else if (result.type === "no-allowed-methods") {
          const allowedMethods = result.allowedMethods || [];
          const missingMethods = requiredMethods.filter(
            (method) => !allowedMethods.includes(method),
          );
          setValidationStatus({
            status: "cors-incomplete",
            allowedMethods,
            missingMethods,
          });
        }
      } else {
        const allowedMethods = await getAllowedMethods(
          s3Settings,
          window.location.origin,
        );
        setValidationStatus({
          status: "success",
          allowedMethods: allowedMethods || requiredMethods,
        });
      }
    } catch {
      setValidationStatus({ status: "failed" });
    }
  }

  const showDetails =
    validationStatus.status === "failed" ||
    validationStatus.status === "cors-incomplete";

  return (
    <div className="flex items-center justify-end gap-2">
      {validationStatus.status !== "idle" && (
        <div className="flex items-center gap-2">
          <StatusIcon status={validationStatus.status} />
          <StatusText status={validationStatus.status} />

          {showDetails && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <Info className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <UIDialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-base">
                    {getDialogTitle(validationStatus.status, t)}
                  </DialogTitle>
                </DialogHeader>
                <DialogContent validationStatus={validationStatus} />
              </UIDialogContent>
            </Dialog>
          )}
        </div>
      )}

      <TestButton
        onTest={validate}
        isLoading={validationStatus.status === "testing"}
        disabled={!isSchemaValid}
      />
    </div>
  );
}
