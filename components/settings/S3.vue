<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { useStorage } from "@vueuse/core";
import { s3ConfigSchema, type S3Config } from "~/types";
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
  <UForm
    :schema="s3ConfigSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
    ref="form"
  >
    <UFormGroup label="Endpoint" name="endpoint" help="域名的第一个部分不应该包含你的 bucket name">
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

    <UFormGroup label="Public URL" name="pubUrl" hint="可选" help="">
      <UInput v-model="state.pubUrl" />
      <template #help>
        访问图片的链接，最后会拼接为 `publicUrl+Key` 的形式，key 为图片在 S3
        中的路径。<br />
        如果储存桶本身是公开的，则不需要该参数，会用 `endpoint/bucketName/key`
        链接访问。
      </template>
    </UFormGroup>

    <UButton type="submit"> 测试 </UButton>
  </UForm>
</template>
