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
import {
  createSyncToken,
  normalizeSyncToken,
  isValidSyncToken,
  type WordCount,
} from "@/lib/encryption/sync-token";
import { AlertCircle, CheckCircle2, Copy, RefreshCw } from "lucide-react";

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
  const [mode, setMode] = useState<"generate" | "import">("generate");
  const [generatedToken, setGeneratedToken] = useState<string>("");
  const [importedToken, setImportedToken] = useState<string>("");
  const [wordCount, setWordCount] = useState<WordCount>(12);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const token = createSyncToken(wordCount);
    setGeneratedToken(token);
    setCopied(false);
  };

  const handleCopy = async () => {
    const token = mode === "generate" ? generatedToken : importedToken;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    const token = mode === "generate" ? generatedToken : importedToken;
    const normalized = normalizeSyncToken(token);
    onTokenConfirm(normalized);
    onOpenChange(false);
    // Reset state
    setGeneratedToken("");
    setImportedToken("");
    setCopied(false);
  };

  const isImportValid = isValidSyncToken(importedToken);
  const canConfirm =
    mode === "generate" ? generatedToken.length > 0 : isImportValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Setup Sync Token</DialogTitle>
          <DialogDescription>
            Your sync token is a BIP39 mnemonic phrase that encrypts your
            profiles. Keep it safe - you&apos;ll need it to sync across devices.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "generate" ? "default" : "outline"}
            onClick={() => setMode("generate")}
            className="flex-1"
          >
            Generate New Token
          </Button>
          <Button
            variant={mode === "import" ? "default" : "outline"}
            onClick={() => setMode("import")}
            className="flex-1"
          >
            Import Existing Token
          </Button>
        </div>

        {mode === "generate" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label>Word Count:</Label>
              <div className="flex gap-2">
                {([12, 15, 18, 21, 24] as WordCount[]).map((count) => (
                  <Button
                    key={count}
                    size="sm"
                    variant={wordCount === count ? "default" : "outline"}
                    onClick={() => setWordCount(count)}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerate} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Token
            </Button>

            {generatedToken && (
              <div className="space-y-3">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="font-mono text-sm break-all">
                    {generatedToken}
                  </p>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">
                      Save this token securely!
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Store it in a password manager or write it down. You
                      cannot recover it if lost, and you&apos;ll need it to sync
                      on other devices.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-token">Enter Your Token</Label>
              <Input
                id="import-token"
                placeholder="Enter your BIP39 mnemonic phrase..."
                value={importedToken}
                onChange={(e) => setImportedToken(e.target.value)}
                className="font-mono"
              />
              {importedToken && (
                <div className="flex items-center gap-2 text-sm">
                  {isImportValid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Valid token</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">Invalid token</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!canConfirm}
            className="flex-1"
          >
            {copied ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Token
              </>
            )}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1"
          >
            Confirm & Enable Sync
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
