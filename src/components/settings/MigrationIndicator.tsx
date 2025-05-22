"use client";
import { useSetAtom } from "jotai";
import { tryMigrateFromV1 } from "./settingsStore";
import { useEffect, useState } from "react";
import { optionsAtom } from "./settingsStore";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function MigrationIndicator() {
  const [hasOldConfig, setHasOldConfig] = useState(false);

  useEffect(() => {
    const oldS3SettingsStr = localStorage.getItem("s3-settings");
    const oldAppSettingsStr = localStorage.getItem("app-settings");

    if (oldS3SettingsStr && oldAppSettingsStr) {
      setHasOldConfig(true);
    }
  }, []);

  const setOptions = useSetAtom(optionsAtom);

  const handleMigrate = () => {
    try {
      const newOptions = tryMigrateFromV1();
      setOptions(newOptions);
      setHasOldConfig(false);
    } catch (error) {
      toast.error("Failed to migrate settings");
      console.error(error);
    }
  };

  if (!hasOldConfig) {
    return null;
  }

  return (
    <Alert className="flex flex-col md:flex-row gap-2 justify-between">
      <div>
        <AlertTitle>Migrate from old version?</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          We found old settings in your browser. Would you like to migrate them?
        </AlertDescription>
      </div>
      <Button onClick={handleMigrate}>Migrate</Button>
    </Alert>
  );
}
