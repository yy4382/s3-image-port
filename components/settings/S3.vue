<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { s3ConfigSchema } from "~/types";

const toast = useToast();
const { s3Settings: state } = useSettings();
const { t } = useI18n();

const form = ref();
const showAccessKeyId = ref(false);
const showSecretAccessKey = ref(false);

type Schema = z.output<typeof s3ConfigSchema>;

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Do something with data
  try {
    toast.add({
      title: t("settings.s3.submitFormButton.message.try.title"),
    });
    await listObj(state.value);
    toast.add({
      title: t("settings.s3.submitFormButton.message.success.title"),
    });
  } catch (err: any) {
    toast.add({
      title: t("settings.s3.submitFormButton.message.fail.title"),
      description: t("settings.s3.submitFormButton.message.fail.description"),
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
      <UButtonGroup class="w-full">
        <UInput
          class="w-full"
          v-model="state.accKeyId"
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
          class="w-full"
          v-model="state.secretAccKey"
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

    <UButton type="submit">
      {{ $t("settings.s3.submitFormButton.title") }}
    </UButton>
  </UForm>
</template>
