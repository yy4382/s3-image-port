<script setup lang="ts">
import type { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { s3SettingsSchema } from "~/types";
import generateTestKeyAndContent from "~/utils/generateTestKeyAndContent";
import * as checkOp from "~/utils/testOps";

const toast = useToast();
const { s3Settings: state } = useSettings();
const { t } = useI18n();

const form = ref();
const showAccessKeyId = ref(false);
const showSecretAccessKey = ref(false);

const uploadChipColor = ref<"green" | "red" | "gray">("gray");
const listChipColor = ref<"green" | "red" | "gray">("gray");
const deleteChipColor = ref<"green" | "red" | "gray">("gray");

const isTestingConnectivity = ref(false);

type Schema = z.output<typeof s3SettingsSchema>;

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  isTestingConnectivity.value = true;
  toast.add({
    title: t("settings.s3.submitFormButton.message.try.title"),
  });
  debug("Start testing S3 connectivity...");
  debug("Generating test key and content...");
  let { testKey, testContent } = generateTestKeyAndContent();
  debug("Generated test key and content:", testKey, testContent);
  try {
    let limit = 3;
    while ((await checkOp.exists(state.value, testKey)) && limit-- > 0) {
      debug("Object already exists, generating new test key and content...");
      ({ testKey, testContent } = generateTestKeyAndContent());
    }
  } catch (e) {
    debug("Error occurred while checking if object exists:", e);
    console.error(e);
    toast.add({
      title: t("settings.s3.submitFormButton.message.fail.title"),
      // prettier-ignore
      description: t("settings.s3.submitFormButton.message.fail.desc4configOrCors"),
      actions: [
        {
          label: t("settings.s3.submitFormButton.message.fail.actionLabel"),
          click: () => {
            window.open(
              t("settings.s3.submitFormButton.message.fail.actionLink"),
              "_blank",
            );
          },
        },
      ],
    });
    uploadChipColor.value = "red";
    listChipColor.value = "red";
    deleteChipColor.value = "red";
    isTestingConnectivity.value = false;
    return;
  }
  debug("Unique test key and content generated.");

  uploadChipColor.value = (await checkOp.upload(
    state.value,
    testKey,
    testContent,
  ))
    ? "green"
    : "red";
  listChipColor.value = (await checkOp.list(state.value)) ? "green" : "red";
  deleteChipColor.value = (await checkOp.delete(state.value, testKey))
    ? "green"
    : "red";

  isTestingConnectivity.value = false;

  const i18nSectionInToast = (() => {
    if (
      uploadChipColor.value === "green" &&
      listChipColor.value === "green" &&
      deleteChipColor.value === "green"
    ) {
      return "success";
    } else if (
      uploadChipColor.value === "red" &&
      listChipColor.value === "red" &&
      deleteChipColor.value === "red"
    ) {
      return "fail";
    } else {
      return "warning";
    }
  })();
  toast.add({
    title: t(
      `settings.s3.submitFormButton.message.${i18nSectionInToast}.title`,
    ),
    description: t(
      `settings.s3.submitFormButton.message.${i18nSectionInToast}.description`,
    ),
    actions:
      i18nSectionInToast === "success"
        ? undefined
        : [
            {
              label: t("settings.s3.submitFormButton.message.fail.actionLabel"),
              click: () => {
                window.open(
                  t("settings.s3.submitFormButton.message.fail.actionLink"),
                  "_blank",
                );
              },
            },
          ],
  });
}
</script>

<template>
  <UAlert
    :title="$t('settings.s3.info.title')"
    :description="$t('settings.s3.info.description')"
    class="my-4"
  />
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
