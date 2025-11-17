import { z } from "zod";
import { settingsForSyncSchema } from "../../settings-store";
import { useTranslations } from "use-intl";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function SettingsViewer(props: {
  data: z.infer<typeof settingsForSyncSchema.shape.data>;
}) {
  const list = props.data.list;
  return (
    <div className="space-y-6 px-6">
      {list.map(([name, profile]) => (
        <ProfileItem key={name} name={name} profile={profile} />
      ))}
    </div>
  );
}

type ProfileItemProps = {
  name: string;
  profile: z.infer<
    typeof settingsForSyncSchema.shape.data.shape.list
  >[number][1];
};
export function ProfileItem(props: ProfileItemProps) {
  const { name, profile } = props;
  const t = useTranslations("settings");
  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{name}</Badge>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">{t("s3Settings.title")}</div>
        <div className="space-y-2 pl-3">
          <ItemViewer
            label={t("s3Settings.endpoint")}
            value={profile.s3.endpoint}
          />
          <ItemViewer
            label={t("s3Settings.bucket")}
            value={profile.s3.bucket}
          />
          <ItemViewer
            label={t("s3Settings.region")}
            value={profile.s3.region}
          />
          <ItemViewer
            label={t("s3Settings.accessKey")}
            value={profile.s3.accKeyId}
          />
          <ItemViewer
            label={t("s3Settings.secretKey")}
            value={profile.s3.secretAccKey}
          />
          <ItemViewer
            label={t("s3Settings.pathStyle")}
            value={profile.s3.forcePathStyle.toString()}
          />
          <ItemViewer
            label={t("s3Settings.publicUrl")}
            value={profile.s3.pubUrl}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="text-sm font-semibold">{t("upload")}</div>
        <div className="space-y-2 pl-3">
          <ItemViewer
            label={t("keyTemplate.title")}
            value={profile.upload.keyTemplate}
          />
          {(profile.upload.keyTemplatePresets?.length ?? 0) > 0 && (
            <>
              <div className="text-xs font-medium text-muted-foreground mt-2">
                {t("keyTemplate.presets.title")}
              </div>
              <div className="space-y-1 pl-2">
                {profile.upload.keyTemplatePresets?.map((preset) => (
                  <ItemViewer
                    key={preset.key}
                    label={preset.key}
                    value={preset.value}
                  />
                ))}
              </div>
            </>
          )}
          <ItemViewer
            label={t("imageCompress.title")}
            value={profile.upload.compressionOption ? "true" : "false"}
          />
          {profile.upload.compressionOption && (
            <div className="space-y-1 pl-2">
              <ItemViewer
                label={t("imageCompress.targetFormat")}
                value={profile.upload.compressionOption.type}
              />
              {"quality" in profile.upload.compressionOption && (
                <ItemViewer
                  label={t("imageCompress.quality")}
                  value={profile.upload.compressionOption.quality.toString()}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="text-sm font-semibold">{t("gallery.title")}</div>
        <div className="space-y-2 pl-3">
          <ItemViewer
            label={t("gallery.autoRefresh")}
            value={profile.gallery.autoRefresh.toString()}
          />
        </div>
      </div>
    </div>
  );
}

function ItemViewer({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-baseline sm:gap-2">
      <div className="text-muted-foreground text-sm sm:min-w-[120px] sm:shrink-0">
        {label}:
      </div>
      <div className="font-mono text-sm break-all">
        {value === "" ? (
          <span className="text-muted-foreground italic">(empty)</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
