"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  createSyncToken,
  normalizeSyncToken,
  isValidSyncToken,
} from "@/lib/encryption/sync-token";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { TokenDisplay } from "./token-display";
import { useTranslations } from "use-intl";

interface TokenSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenConfirm: (token: string) => void;
}

export function TokenSetupDialog({
  open,
  onOpenChange,
  onTokenConfirm,
}: TokenSetupDialogProps) {
  const t = useTranslations("settings.sync.tokenSetup");
  const [mode, setMode] = useState<"generate" | "import">("generate");
  const [generatedToken, setGeneratedToken] = useState<string>("");
  const [importedToken, setImportedToken] = useState<string>("");

  const handleGenerate = () => {
    const token = createSyncToken(24);
    setGeneratedToken(token);
  };

  const handleConfirm = () => {
    const token = mode === "generate" ? generatedToken : importedToken;
    const normalized = normalizeSyncToken(token);
    onTokenConfirm(normalized);
    onOpenChange(false);
    // Reset state
    setGeneratedToken("");
    setImportedToken("");
  };

  const isImportValid = isValidSyncToken(importedToken);
  const canConfirm =
    mode === "generate" ? generatedToken.length > 0 : isImportValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as "generate" | "import")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="generate" className="flex-1">
              {t("generateTab")}
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1">
              {t("importTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <Button onClick={handleGenerate} className="w-full">
              <RefreshCw />
              {t("generateButton")}
            </Button>

            {generatedToken && (
              <div className="space-y-3">
                <TokenDisplay
                  token={generatedToken}
                  showToggle={false}
                  defaultShowFull={true}
                />
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">{t("saveWarning.title")}</p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      {t("saveWarning.description")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-token">{t("importLabel")}</Label>
              <Input
                id="import-token"
                placeholder={t("importPlaceholder")}
                value={importedToken}
                onChange={(e) => setImportedToken(e.target.value)}
                className="font-mono"
              />
              {importedToken && (
                <div className="flex items-center gap-2 text-sm">
                  {isImportValid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">{t("validToken")}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">
                        {t("invalidToken")}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full"
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
