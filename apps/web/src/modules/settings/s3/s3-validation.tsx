"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { settings } from "@/stores/atoms/settings";
import {
  diagnosticFailureMessage,
  serializeDiagnostics,
  type StorageDiagnosticContext,
  type StorageDiagnosticFailure,
} from "@/modules/image-storage/diagnostics";

function Failure({
  error,
  cors = false,
}: {
  error: StorageDiagnosticFailure;
  cors?: boolean;
}) {
  const t = useTranslations("settings.s3Validation");
  const reason = diagnosticFailureMessage(error);
  const key =
    cors && reason === "accessDenied"
      ? error.code === "AccessDenied"
        ? "corsDenied"
        : "server"
      : reason;
  return (
    <div className="space-y-2">
      <p>{t(`reasons.${key}`)}</p>
      <p className="text-muted-foreground">{t(`hints.${key}`)}</p>
      {key === "network" && (
        <p className="text-muted-foreground">{t("browserHelp")}</p>
      )}
    </div>
  );
}

function RequestDetails({
  context,
  error,
  httpStatus,
}: {
  context: StorageDiagnosticContext;
  error?: StorageDiagnosticFailure;
  httpStatus?: number;
}) {
  const t = useTranslations("settings.s3Validation");
  const fields = [
    [
      t("fields.request"),
      t(context.operation === "ListObjectsV2" ? "listRequest" : "corsRequest") +
        ` (${context.operation})`,
    ],
    ...(error?.code ? [[t("fields.code"), error.code]] : []),
    ...((error?.httpStatus ?? httpStatus) !== undefined
      ? [[t("fields.httpStatus"), String(error?.httpStatus ?? httpStatus)]]
      : []),
    [t("fields.origin"), context.origin],
    [t("fields.endpoint"), context.endpoint],
    [t("fields.bucket"), context.bucket],
    ...(context.prefix !== undefined
      ? [[t("fields.prefix"), context.prefix || t("emptyPrefix")]]
      : []),
  ];
  return (
    <dl className="space-y-2 text-sm">
      {fields
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="grid gap-0.5 min-w-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono whitespace-pre-wrap [overflow-wrap:anywhere]">
              {value}
            </dd>
          </div>
        ))}
    </dl>
  );
}

export function S3Validation() {
  const t = useTranslations("settings.s3Validation");
  const locale = useLocale();
  const storage = useAtomValue(settings.storage);
  const dispatch = useSetAtom(settings.storage);
  const access = storage.access;
  const cors = storage.cors;
  const [copyStatus, setCopyStatus] = useState<
    "copied" | "copyFailed" | undefined
  >();
  const completed = access.status === "success" || access.status === "failed";
  const corsCompleted = cors.status === "success" || cors.status === "failed";
  const test = () => {
    setCopyStatus(undefined);
    void dispatch({ type: "test-access" });
  };
  const checkCors = () => {
    setCopyStatus(undefined);
    void dispatch({ type: "check-cors" });
  };

  async function copyDetails() {
    if (!completed) return;
    const entries = [access, ...(corsCompleted ? [cors] : [])].map(
      (result) => ({
        context: result.context,
        status: result.status,
        ...(result.status === "failed"
          ? { error: result.error }
          : { httpStatus: result.value.httpStatus }),
      }),
    );
    try {
      await navigator.clipboard.writeText(serializeDiagnostics(entries));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("copyFailed");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 min-w-0">
      <div role="status" className="flex items-start gap-2 text-sm min-w-0">
        {access.status === "testing" && (
          <Loader2
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin"
          />
        )}
        {access.status === "success" && (
          <CheckCircle
            aria-hidden="true"
            className="size-4 shrink-0 text-green-600"
          />
        )}
        {access.status === "failed" && (
          <XCircle
            aria-hidden="true"
            className="size-4 shrink-0 text-red-600"
          />
        )}
        {access.status !== "idle" && (
          <div>
            <p>{t(access.status)}</p>
            {access.status === "failed" && (
              <p className="text-muted-foreground">
                {t(`reasons.${diagnosticFailureMessage(access.error)}`)}
              </p>
            )}
          </div>
        )}
      </div>
      {completed && (
        <Dialog>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCopyStatus(undefined)}
              >
                {t("details")}
              </Button>
            }
          />
          <DialogContent
            showCloseButton={false}
            className="max-h-[85dvh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>{t("detailsTitle")}</DialogTitle>
              <DialogDescription>{t("scope")}</DialogDescription>
            </DialogHeader>
            <section className="space-y-3" aria-label={t("listRequest")}>
              <h3 className="font-medium">{t(access.status)}</h3>
              {access.status === "failed" && <Failure error={access.error} />}
              <RequestDetails
                context={access.context}
                error={access.status === "failed" ? access.error : undefined}
                httpStatus={
                  access.status === "success"
                    ? access.value.httpStatus
                    : undefined
                }
              />
              {access.status === "failed" && (
                <Button variant="outline" size="sm" onClick={test}>
                  {t("retry")}
                </Button>
              )}
            </section>
            <section
              className="space-y-3 border-t pt-4"
              aria-label={t("corsRequest")}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{t("corsTitle")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cors.status === "testing"}
                  onClick={checkCors}
                >
                  {t(cors.status === "testing" ? "checkingCors" : "checkCors")}
                </Button>
              </div>
              <p className="text-muted-foreground">{t("corsScope")}</p>
              <div role="status" className="space-y-2">
                {corsCompleted && (
                  <p className="font-medium">
                    {t(cors.status === "success" ? "corsRead" : "corsFailed")}
                  </p>
                )}
                {cors.status === "failed" && (
                  <Failure error={cors.error} cors />
                )}
                {cors.status === "success" && (
                  <>
                    {!cors.value.originMatched ? (
                      <p>
                        {t("originMissing", { origin: cors.context.origin })}
                      </p>
                    ) : cors.value.missingMethods.length > 0 ? (
                      <p>
                        {t("methodsMissing", {
                          methods: cors.value.missingMethods.join(", "),
                        })}
                      </p>
                    ) : (
                      <p>{t("noMissingRules")}</p>
                    )}
                    <p className="text-muted-foreground">{t("rulesScope")}</p>
                  </>
                )}
              </div>
              {corsCompleted && (
                <RequestDetails
                  context={cors.context}
                  error={cors.status === "failed" ? cors.error : undefined}
                  httpStatus={
                    cors.status === "success"
                      ? cors.value.httpStatus
                      : undefined
                  }
                />
              )}
              <a
                className="underline underline-offset-2"
                href={`/${locale}/docs/getting-started#cors`}
                target="_blank"
                rel="noreferrer"
              >
                {t("corsHelp")}
              </a>
              <details className="space-y-2">
                <summary className="cursor-pointer">{t("corsExample")}</summary>
                <p className="text-muted-foreground">{t("exampleScope")}</p>
                <pre className="rounded bg-muted p-3 text-xs whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {JSON.stringify(
                    [
                      {
                        AllowedOrigins: [access.context.origin],
                        AllowedMethods: ["GET", "HEAD", "PUT", "DELETE"],
                        AllowedHeaders: ["*"],
                      },
                    ],
                    null,
                    2,
                  )}
                </pre>
              </details>
            </section>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <p role="status" className="text-sm">
                {copyStatus && t(copyStatus)}
              </p>
              <Button variant="outline" onClick={copyDetails}>
                {t("copyDetails")}
              </Button>
              <DialogClose render={<Button variant="outline" />}>
                {t("close")}
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={test}
        disabled={
          storage.validation.status !== "valid" || access.status === "testing"
        }
      >
        {t(
          access.status === "testing"
            ? "testing"
            : access.status === "failed"
              ? "retry"
              : "testButton",
        )}
      </Button>
    </div>
  );
}
