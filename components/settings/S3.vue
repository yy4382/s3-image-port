<script setup lang="ts">
import type { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { s3SettingsSchema } from "~/types";
import generateTestKeyAndContent from "~/utils/generateTestKeyAndContent";
import {
  checkGrantedToUpload,
  checkGrantedToList,
  checkGrantedToDelete,
  checkObjectExists,
} from "~/utils/testOps";

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
  console.log("Start testing S3 connectivity...");
  console.log("Generating test key and content...");
  let { testKey, testContent } = generateTestKeyAndContent();
  console.log("Generated test key and content:", testKey, testContent);
  while (checkObjectExists(testKey)) {
    console.log(
      "Object already exists, generating new test key and content..."
    );
    ({ testKey, testContent } = generateTestKeyAndContent());
  }
  console.log("Unique test key and content generated.");

  uploadChipColor.value = (await checkGrantedToUpload(testKey, testContent))
    ? "green"
    : "red";
  listChipColor.value = (await checkGrantedToList(testKey, testContent))
    ? "green"
    : "red";
  deleteChipColor.value = (await checkGrantedToDelete(testKey, testContent))
    ? "green"
    : "red";

  isTestingConnectivity.value = false;

  const i18nSectionInToast = computed(() => {
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
  });
  toast.add({
    title: t(
      `settings.s3.submitFormButton.message.${i18nSectionInToast.value}.title`
    ),
    description: t(
      `settings.s3.submitFormButton.message.${i18nSectionInToast.value}.description`
    ),
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
      :label="$t('settings.s3.form.endpoint.title')"
      :description="$t('settings.s3.form.endpoint.description')"
      name="endpoint"
      required
    >
      <UInput v-model="state.endpoint" />
    </UFormGroup>

    <UFormGroup
      :label="$t('settings.s3.form.bucketName.title')"
      :description="$t('settings.s3.form.bucketName.description')"
      name="bucket"
      required
    >
      <UInput v-model="state.bucket" />
    </UFormGroup>

    <UFormGroup
      :label="$t('settings.s3.form.region.title')"
      :description="$t('settings.s3.form.region.description')"
      name="region"
      required
    >
      <UInput v-model="state.region" />
    </UFormGroup>

    <UFormGroup
      :label="$t('settings.s3.form.accessKeyId.title')"
      name="accKeyId"
      required
    >
      <UButtonGroup class="w-full">
        <UInput
          v-model="state.accKeyId"
          class="w-full"
          :type="showAccessKeyId ? 'text' : 'password'"
        />
        <UButton
          :icon="showAccessKeyId ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
          color="gray"
          @click="showAccessKeyId = !showAccessKeyId"
        />
      </UButtonGroup>
    </UFormGroup>

    <UFormGroup
      :label="$t('settings.s3.form.secretAccessKey.title')"
      name="secretAccKey"
      required
    >
      <UButtonGroup class="w-full">
        <UInput
          v-model="state.secretAccKey"
          class="w-full"
          :type="showSecretAccessKey ? 'text' : 'password'"
        />
        <UButton
          :icon="
            showSecretAccessKey ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'
          "
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
                  <p>
                    {{
                      $t("settings.s3.form.publicUrl.descriptionExtended.line1")
                    }}
                  </p>
                  <p>
                    {{
                      $t("settings.s3.form.publicUrl.descriptionExtended.line2")
                    }}
                  </p>
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
        <UChip :color="uploadChipColor">
          <UIcon name="i-mingcute-file-upload-line" class="text-xl" />
        </UChip>
        <UChip :color="listChipColor">
          <UIcon name="i-mingcute-directory-line" class="text-xl" />
        </UChip>
        <UChip :color="deleteChipColor">
          <UIcon name="i-mingcute-delete-2-line" class="text-xl" />
        </UChip>
      </div>
      <UButton type="submit" :loading="isTestingConnectivity">
        {{ $t("settings.s3.submitFormButton.title") }}
      </UButton>
    </div>
  </UForm>
</template>
