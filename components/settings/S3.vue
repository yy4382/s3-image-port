<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { useStorage } from "@vueuse/core";
import type { S3Config } from "~/types";
const toast = useToast();

const schema = z.object({
  endpoint: z.string().url("Invalid URL"),
  bucket: z.string(),
  accKeyId: z.string(),
  secretAccKey: z.string(),
  region: z.string(),
});

type Schema = z.output<typeof schema>;

const state: Ref<S3Config> = useStorage("s3-settings", {
  endpoint: "",
  bucket: "",
  accKeyId: "",
  secretAccKey: "",
  region: "",
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
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
    ref="form"
  >
    <UFormGroup label="Endpoint" name="endpoint">
      <UInput v-model="state.endpoint" />
    </UFormGroup>

    <UFormGroup label="Bucket name" name="bucket">
      <UInput v-model="state.bucket" />
    </UFormGroup>

    <UFormGroup label="Region" name="region">
      <UInput v-model="state.region" />
    </UFormGroup>

    <UFormGroup label="Access key ID" name="accKeyId">
      <UInput v-model="state.accKeyId" type="password" />
    </UFormGroup>

    <UFormGroup label="Secret access key" name="secretAccKey">
      <UInput v-model="state.secretAccKey" type="password" />
    </UFormGroup>

    <UButton type="submit"> 测试 </UButton>
  </UForm>
</template>
