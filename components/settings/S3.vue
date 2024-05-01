<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { useStorage } from "@vueuse/core";
import { s3ConfigSchema, type S3Config } from "~/types";
const toast = useToast();

type Schema = z.output<typeof s3ConfigSchema>;

const state: Ref<S3Config> = useStorage("s3-settings", {
  endpoint: "",
  bucket: "",
  accKeyId: "",
  secretAccKey: "",
  region: "",
  pubUrl: "",
});
const form = ref();
async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Do something with data
  try {
    await listObj(state.value);
    toast.add({
      title: "Success",
    });
  } catch (err: any) {
    toast.add({
      title: "Error",
      description: err.message + ", check dev console for more info",
    });
  }
}
</script>

<template>
  <UAlert
    :title="$t('settings.s3.info.title')"
    :description="$t('settings.s3.info.description')"
    class="my-4"
  />
  <UForm
    :schema="s3ConfigSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
    ref="form"
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
      <UInput v-model="state.accKeyId" type="password" />
    </UFormGroup>

    <UFormGroup
      :label="$t('settings.s3.form.secretAccessKey.title')"
      name="secretAccKey"
      required
    >
      <UInput v-model="state.secretAccKey" type="password" />
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
                <UCard>
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

    <UButton type="submit"> {{ $t("settings.s3.submitFormButton") }} </UButton>
  </UForm>
</template>
