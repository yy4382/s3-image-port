<script setup lang="ts">
import type { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { s3SettingsSchema } from "~/types";

const toast = useToast();
const settings = useSettingsStore();
const { s3: state } = storeToRefs(settings);
const { t } = useI18n();

const form = ref();
const showAccessKeyId = ref(false);
const showSecretAccessKey = ref(false);

const uploadChipColor = ref<"green" | "red" | "gray">("gray");
const listChipColor = ref<"green" | "red" | "gray">("gray");
const deleteChipColor = ref<"green" | "red" | "gray">("gray");

const isTestingConnectivity = ref(false);

type Schema = z.output<typeof s3SettingsSchema>;

const failActions = [
  {
    label: t("settings.s3.submitFormButton.message.fail.actionLabel"),
    click: () => {
      window.open(
        t("settings.s3.submitFormButton.message.fail.actionLink"),
        "_blank",
      );
    },
  },
];

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  isTestingConnectivity.value = true;
  toast.add({
    title: t("settings.s3.submitFormButton.message.try.title"),
  });
  const { get, upload, delete: del, list } = await settings.test();
  if (!get) {
    toast.add({
      title: t("settings.s3.submitFormButton.message.fail.title"),
      // prettier-ignore
      description: t("settings.s3.submitFormButton.message.fail.desc4configOrCors"),
      actions: failActions,
    });
    uploadChipColor.value = "red";
    listChipColor.value = "red";
    deleteChipColor.value = "red";
    isTestingConnectivity.value = false;
    return;
  }

  uploadChipColor.value = upload ? "green" : "red";
  listChipColor.value = list ? "green" : "red";
  deleteChipColor.value = del ? "green" : "red";

  isTestingConnectivity.value = false;

  const i18nSectionInToast = (() => {
    if (upload && list && del) {
      return "success";
    } else if (!upload && !list && !del) {
      return "fail";
    } else {
      return "warning";
    }
  })();
  toast.add({
    // prettier-ignore
    title: t(`settings.s3.submitFormButton.message.${i18nSectionInToast}.title`),
    // prettier-ignore
    description: t(`settings.s3.submitFormButton.message.${i18nSectionInToast}.description`),
    actions: i18nSectionInToast === "success" ? undefined : failActions,
  });
}
</script>

<template>
  <div class="flex flex-col space-y-2 mb-4">
    <UAlert
      :title="$t('settings.s3.info.privacy.title')"
      :description="$t('settings.s3.info.privacy.description')"
    />
    <UAlert
      v-if="
        !state.endpoint ||
        !state.bucket ||
        !state.region ||
        !state.accKeyId ||
        !state.secretAccKey
      "
      :title="$t('settings.s3.info.howTo.title')"
    >
      <template #description>
        <span>{{ $t("settings.s3.info.howTo.description.part1") }}</span>
        <ULink
          :to="
            $i18n.locale === 'zh'
              ? 'https://docs.iport.yfi.moe/zh/guide/getting-started'
              : 'https://docs.iport.yfi.moe/guide/getting-started'
          "
          inactive-class="text-primary-500 dark:text-primary-400
          hover:text-primary-600 dark:hover:text-primary-500 hover:underline
          hover:underline-offset-2 transition-colors"
        >
          {{ $t("settings.s3.info.howTo.description.part2") }}</ULink
        >
        <span>{{ $t("settings.s3.info.howTo.description.part3") }}</span>
      </template>
    </UAlert>
  </div>
  <UForm
    ref="form"
    :schema="s3SettingsSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UFormGroup
      v-slot="{ error }"
      :label="$t('settings.s3.form.endpoint.title')"
      :description="$t('settings.s3.form.endpoint.description')"
      name="endpoint"
      required
      :error="!state.endpoint && $t('settings.s3.form.endpoint.error')"
    >
      <UInput
        v-model="state.endpoint"
        :trailing-icon="
          error ? 'i-heroicons-exclamation-triangle-20-solid' : undefined
        "
      />
    </UFormGroup>

    <UFormGroup
      v-slot="{ error }"
      :label="$t('settings.s3.form.bucketName.title')"
      :description="$t('settings.s3.form.bucketName.description')"
      name="bucket"
      required
      :error="!state.bucket && $t('settings.s3.form.bucketName.error')"
    >
      <UInput
        v-model="state.bucket"
        :trailing-icon="
          error ? 'i-heroicons-exclamation-triangle-20-solid' : undefined
        "
      />
    </UFormGroup>

    <UFormGroup
      v-slot="{ error }"
      :label="$t('settings.s3.form.region.title')"
      :description="$t('settings.s3.form.region.description')"
      name="region"
      required
      :error="!state.region && $t('settings.s3.form.region.error')"
    >
      <UInput
        v-model="state.region"
        :trailing-icon="
          error ? 'i-heroicons-exclamation-triangle-20-solid' : undefined
        "
      />
    </UFormGroup>

    <UFormGroup
      v-slot="{ error }"
      :label="$t('settings.s3.form.accessKeyId.title')"
      name="accKeyId"
      required
      :error="!state.accKeyId && $t('settings.s3.form.accessKeyId.error')"
    >
      <UButtonGroup class="w-full">
        <UInput
          v-model="state.accKeyId"
          class="w-full"
          :type="showAccessKeyId ? 'text' : 'password'"
          :trailing-icon="
            error ? 'i-heroicons-exclamation-triangle-20-solid' : undefined
          "
        />
        <UButton
          :icon="showAccessKeyId ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
          color="gray"
          @click="showAccessKeyId = !showAccessKeyId"
        />
      </UButtonGroup>
    </UFormGroup>

    <UFormGroup
      v-slot="{ error }"
      :label="$t('settings.s3.form.secretAccessKey.title')"
      name="secretAccKey"
      required
      :error="
        !state.secretAccKey && $t('settings.s3.form.secretAccessKey.error')
      "
    >
      <UButtonGroup class="w-full">
        <UInput
          v-model="state.secretAccKey"
          class="w-full"
          :type="showSecretAccessKey ? 'text' : 'password'"
          :trailing-icon="
            error ? 'i-heroicons-exclamation-triangle-20-solid' : undefined
          "
        />
        <!-- prettier-ignore-attribute :icon -->
        <UButton
          :icon="showSecretAccessKey ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
          color="gray"
          @click="showSecretAccessKey = !showSecretAccessKey"
        />
      </UButtonGroup>
    </UFormGroup>
    <div class="flex justify-between">
      <UFormGroup
        :label="$t('settings.s3.form.forcePathStyle.title')"
        :description="$t('settings.s3.form.forcePathStyle.description')"
        name="forcePathStyle"
      />
      <div class="flex flex-col justify-center">
        <UToggle
          v-model="state.forcePathStyle"
          on-icon="i-heroicons-check-20-solid"
          off-icon="i-heroicons-x-mark-20-solid"
        />
      </div>
    </div>

    <UFormGroup
      :label="$t('settings.s3.form.publicUrl.title')"
      :hint="$t('settings.s3.form.publicUrl.optional')"
      name="pubUrl"
    >
      <template #description>
        <div>
          <span class="inline-flex items-center">
            {{ $t("settings.s3.form.publicUrl.description") }}
            <UPopover mode="hover">
              <UButton
                icon="i-mingcute-information-line"
                size="2xs"
                color="primary"
                square
                variant="link"
              />
              <template #panel>
                <UCard
                  :ui="{
                    body: {
                      base: 'max-w-[90vw] md:w-[40rem] space-y-3',
                    },
                  }"
                >
                  <!-- prettier-ignore -->
                  <p>{{ $t("settings.s3.form.publicUrl.descriptionExtended.line1") }}</p>
                  <!-- prettier-ignore -->
                  <p>{{ $t("settings.s3.form.publicUrl.descriptionExtended.line2") }}</p>
                </UCard>
              </template>
            </UPopover>
          </span>
        </div>
      </template>
      <UInput v-model="state.pubUrl" />
    </UFormGroup>

    <div class="flex flex-row justify-between">
      <div class="flex flex-row gap-2 items-center justify-start">
        <UTooltip :text="$t('settings.s3.submitFormButton.icons.upload')">
          <UChip :color="uploadChipColor">
            <UIcon name="i-mingcute-file-upload-line" class="text-xl" />
          </UChip>
        </UTooltip>
        <UTooltip :text="$t('settings.s3.submitFormButton.icons.list')">
          <UChip :color="listChipColor">
            <UIcon name="i-mingcute-directory-line" class="text-xl" />
          </UChip>
        </UTooltip>
        <UTooltip :text="$t('settings.s3.submitFormButton.icons.delete')">
          <UChip :color="deleteChipColor">
            <UIcon name="i-mingcute-delete-2-line" class="text-xl" />
          </UChip>
        </UTooltip>
      </div>
      <UButton type="submit" :loading="isTestingConnectivity">
        {{ $t("settings.s3.submitFormButton.title") }}
      </UButton>
    </div>
  </UForm>
</template>
