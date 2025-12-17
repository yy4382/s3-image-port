import { z } from "zod";
import { settingsForSyncSchema } from "@/stores/schemas/settings";
import { useTranslations } from "use-intl";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MinusIcon, PlusIcon, ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import deepEqual from "fast-deep-equal";

export function SettingsViewer(props: {
  localData: z.infer<typeof settingsForSyncSchema.shape.data>;
  remoteData: z.infer<typeof settingsForSyncSchema.shape.data>;
}) {
  const { localData, remoteData } = props;

  // Create a map of all profile names from both local and remote
  const localMap = new Map(localData.list);
  const remoteMap = new Map(remoteData.list);
  const allNames = new Set([...localMap.keys(), ...remoteMap.keys()]);

  return (
    <div className="space-y-4">
      {Array.from(allNames).map((name) => (
        <ProfileItem
          key={name}
          name={name}
          localProfile={localMap.get(name)}
          remoteProfile={remoteMap.get(name)}
        />
      ))}
    </div>
  );
}

type ProfileType = z.infer<
  typeof settingsForSyncSchema.shape.data.shape.list
>[number][1];

type ProfileItemProps = {
  name: string;
  localProfile?: ProfileType;
  remoteProfile?: ProfileType;
};

function ProfileItem(props: ProfileItemProps) {
  const { name, localProfile, remoteProfile } = props;
  const t = useTranslations("settings");

  // Use remote profile as primary, fall back to local if remote doesn't exist
  const profile = remoteProfile ?? localProfile!;

  return (
    <Collapsible className="rounded-lg border bg-muted/30 p-4">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 [&[data-state=open]>svg]:rotate-180">
        <div className="flex items-center gap-2">
          {name}
          <StatusBadge {...props} />
        </div>
        <ChevronDownIcon className="h-4 w-4 transition-transform duration-200" />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 mt-4">
        <div className="space-y-3">
          <div className="text-sm font-semibold">{t("s3Settings.title")}</div>
          <div className="space-y-2">
            <ItemDiffViewer
              label={t("s3Settings.endpoint")}
              localValue={localProfile?.s3.endpoint}
              remoteValue={remoteProfile?.s3.endpoint}
            />
            <ItemDiffViewer
              label={t("s3Settings.bucket")}
              localValue={localProfile?.s3.bucket}
              remoteValue={remoteProfile?.s3.bucket}
            />
            <ItemDiffViewer
              label={t("s3Settings.region")}
              localValue={localProfile?.s3.region}
              remoteValue={remoteProfile?.s3.region}
            />
            <ItemDiffViewer
              label={t("s3Settings.accessKey")}
              localValue={localProfile?.s3.accKeyId}
              remoteValue={remoteProfile?.s3.accKeyId}
            />
            <ItemDiffViewer
              label={t("s3Settings.secretKey")}
              localValue={localProfile?.s3.secretAccKey}
              remoteValue={remoteProfile?.s3.secretAccKey}
            />
            <ItemDiffViewer
              label={t("s3Settings.pathStyle")}
              localValue={localProfile?.s3.forcePathStyle.toString()}
              remoteValue={remoteProfile?.s3.forcePathStyle.toString()}
            />
            <ItemDiffViewer
              label={t("s3Settings.publicUrl")}
              localValue={localProfile?.s3.pubUrl}
              remoteValue={remoteProfile?.s3.pubUrl}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="text-sm font-semibold">{t("upload")}</div>
          <div className="space-y-2">
            <ItemDiffViewer
              label={t("keyTemplate.title")}
              localValue={localProfile?.upload.keyTemplate}
              remoteValue={remoteProfile?.upload.keyTemplate}
            />
            {((remoteProfile?.upload.keyTemplatePresets?.length ?? 0) > 0 ||
              (localProfile?.upload.keyTemplatePresets?.length ?? 0) > 0) && (
              <>
                <div className="text-xs font-medium text-muted-foreground mt-2">
                  {t("keyTemplate.presets.title")}
                </div>
                <div className="space-y-1 pl-2">
                  <KeyTemplatePresetsDiff
                    localPresets={localProfile?.upload.keyTemplatePresets}
                    remotePresets={remoteProfile?.upload.keyTemplatePresets}
                  />
                </div>
              </>
            )}
            <ItemDiffViewer
              label={t("imageCompress.title")}
              localValue={
                localProfile?.upload.compressionOption ? "true" : "false"
              }
              remoteValue={
                remoteProfile?.upload.compressionOption ? "true" : "false"
              }
            />
            {(profile.upload.compressionOption ||
              (localProfile?.upload.compressionOption &&
                !remoteProfile?.upload.compressionOption)) && (
              <div className="space-y-1 pl-2">
                <ItemDiffViewer
                  label={t("imageCompress.targetFormat")}
                  localValue={localProfile?.upload.compressionOption?.type}
                  remoteValue={remoteProfile?.upload.compressionOption?.type}
                />
                {("quality" in (profile.upload.compressionOption ?? {}) ||
                  "quality" in
                    (localProfile?.upload.compressionOption ?? {})) && (
                  <ItemDiffViewer
                    label={t("imageCompress.quality")}
                    localValue={
                      localProfile?.upload.compressionOption &&
                      "quality" in localProfile.upload.compressionOption
                        ? localProfile.upload.compressionOption.quality.toString()
                        : undefined
                    }
                    remoteValue={
                      remoteProfile?.upload.compressionOption &&
                      "quality" in remoteProfile.upload.compressionOption
                        ? remoteProfile.upload.compressionOption.quality.toString()
                        : undefined
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="text-sm font-semibold">{t("gallery.title")}</div>
          <div className="space-y-2">
            <ItemDiffViewer
              label={t("gallery.autoRefresh")}
              localValue={localProfile?.gallery.autoRefresh.toString()}
              remoteValue={remoteProfile?.gallery.autoRefresh.toString()}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ItemDiffViewer({
  label,
  localValue,
  remoteValue,
}: {
  label: string;
  localValue?: string;
  remoteValue?: string;
}) {
  const t = useTranslations("settings.sync.settingsViewer");
  const isDifferent = localValue !== remoteValue;
  const isRemoved = localValue !== undefined && remoteValue === undefined;
  const isAdded = localValue === undefined && remoteValue !== undefined;

  const displayValue = remoteValue ?? localValue ?? "";
  const isEmpty = displayValue === "";

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-baseline gap-2">
        <div className="text-muted-foreground text-sm min-w-[120px] shrink-0">
          {label}:
        </div>
        <div className="flex-1 space-y-1">
          {isDifferent &&
          localValue !== undefined &&
          remoteValue !== undefined ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="px-0.5">
                  <MinusIcon />
                </Badge>
                <span className="font-mono text-sm break-all text-muted-foreground line-through">
                  {localValue === "" ? (
                    <span className="italic">{t("empty")}</span>
                  ) : (
                    localValue
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600 px-0.5">
                  <PlusIcon />
                </Badge>
                <span className="font-mono text-sm break-all">
                  {remoteValue === "" ? (
                    <span className="italic">{t("empty")}</span>
                  ) : (
                    remoteValue
                  )}
                </span>
              </div>
            </>
          ) : isRemoved ? (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="px-0.5">
                <MinusIcon />
              </Badge>
              <span className="font-mono text-sm break-all text-muted-foreground line-through">
                {localValue === "" ? (
                  <span className="italic">{t("empty")}</span>
                ) : (
                  localValue
                )}
              </span>
            </div>
          ) : isAdded ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600 px-0.5">
                <PlusIcon />
              </Badge>
              <span className="font-mono text-sm break-all">
                {remoteValue === "" ? (
                  <span className="italic">{t("empty")}</span>
                ) : (
                  remoteValue
                )}
              </span>
            </div>
          ) : (
            <span className="font-mono text-sm break-all">
              {isEmpty ? (
                <span className="text-muted-foreground italic">
                  {t("empty")}
                </span>
              ) : (
                displayValue
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function KeyTemplatePresetsDiff({
  localPresets,
  remotePresets,
}: {
  localPresets?: Array<{ key: string; value: string }>;
  remotePresets?: Array<{ key: string; value: string }>;
}) {
  const localMap = new Map(localPresets?.map((p) => [p.key, p.value]) ?? []);
  const remoteMap = new Map(remotePresets?.map((p) => [p.key, p.value]) ?? []);
  const allKeys = new Set([...localMap.keys(), ...remoteMap.keys()]);

  return (
    <>
      {Array.from(allKeys).map((key) => (
        <ItemDiffViewer
          key={key}
          label={key}
          localValue={localMap.get(key)}
          remoteValue={remoteMap.get(key)}
        />
      ))}
    </>
  );
}

function StatusBadge(props: ProfileItemProps) {
  const { localProfile, remoteProfile } = props;
  const t = useTranslations("settings.sync.settingsViewer");

  // Check if profile has changes
  const hasChanges =
    localProfile && remoteProfile && !deepEqual(localProfile, remoteProfile);

  // Determine the status badge
  let statusBadge: React.ReactNode = null;
  if (!localProfile) {
    statusBadge = (
      <Badge variant="default" className="bg-green-600">
        {t("newInRemote")}
      </Badge>
    );
  } else if (!remoteProfile) {
    statusBadge = <Badge variant="destructive">{t("removedInRemote")}</Badge>;
  } else if (hasChanges) {
    statusBadge = <Badge variant="outline">{t("changed")}</Badge>;
  }
  return statusBadge;
}
