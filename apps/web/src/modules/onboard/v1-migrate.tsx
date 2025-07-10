import { Button } from "@/components/ui/button";
import {
  useHandleV1ClipboardImport,
  useLoadProfile,
} from "../settings/profiles-utils";
import { useContext, useState } from "react";
import { StepContext } from "./onboard-util";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export function V1Migrate() {
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        Migrating from v1
      </h2>
      <div className="prose dark:prose-invert">
        <p>
          If you have used v1 of the app, you can migrate your data to the new
          version.
        </p>
        <p>
          Copy your Profile from v1 (
          <a
            href={`https://iport.yfi.moe/${locale}/settings/profiles`}
            target="_blank"
            rel="noreferrer"
          >
            iport.yfi.moe
          </a>
          ), and press the Migrate button below. It will read the clipboard
          content, and create a new profile in the new app.
        </p>
      </div>
    </div>
  );
}

export function V1MigrateAction() {
  const handleV1ClipboardImport = useHandleV1ClipboardImport();
  const { nextStep } = useContext(StepContext);
  const router = useRouter();
  const locale = useLocale();
  const [migrated, setMigrated] = useState<string | false>(false);
  const loadProfile = useLoadProfile();

  const handleMigrate = async () => {
    const result = await handleV1ClipboardImport();
    if (result.success) {
      setMigrated(result.name);
    }
  };

  const handleStart = () => {
    if (!migrated) return;
    loadProfile(migrated);
    router.push("/gallery", { locale });
  };

  return (
    <div className="flex gap-2">
      {migrated ? (
        <Button onClick={handleStart}>Start using</Button>
      ) : (
        <>
          <Button onClick={handleMigrate}>Migrate</Button>
          <Button variant="outline" onClick={nextStep}>
            I haven&apos;t used v1
          </Button>
        </>
      )}
    </div>
  );
}
