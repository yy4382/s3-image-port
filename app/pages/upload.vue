<template>
  <UContainer class="space-y-8 max-w-xl w-full">
    <UContainer class="!px-0">
      <UploadWrapper v-model:uploadedLinks="uploadedLinks" class="w-full" />
    </UContainer>
    <UTabs v-if="uploadedLinks.length > 0" :items="items">
      <template #item="{ item }">
        <UCard>
          <ul class="space-y-3">
            <li v-for="link in item.links" :key="link">
              <UseClipboard v-slot="{ copy }" :source="link">
                <UButton
                  color="black"
                  variant="link"
                  class="w-full"
                  @click="
                    copy() && toast.add({ title: $t('upload.message.copied') })
                  "
                >
                  <span class="truncate">{{ link }}</span>
                </UButton>
              </UseClipboard>
            </li>
          </ul>
        </UCard>
      </template>
    </UTabs>
  </UContainer>
</template>

<script setup lang="ts">
import { UseClipboard } from "@vueuse/components";
import type { UploadedFileLinkObj } from "~/types";
const { t } = useI18n();
const toast = useToast();
const settings = useSettingsStore();

onMounted(() => {
  if (!settings.validity.s3) {
    useWrongSettingToast("s3");
    console.error("Invalid S3 settings");
  }
  if (!settings.validity.app) {
    useWrongSettingToast("app");
    console.error("Invalid App settings");
  }
});

const uploadedLinks: Ref<UploadedFileLinkObj[]> = ref(
  import.meta.env.DEV
    ? [
        {
          link: "https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabc.png",
          name: "abc.png",
        },
      ]
    : [],
);

const items = computed(() => [
  {
    type: "pureLink",
    links: uploadedLinks.value.map((link) => link.link),
    label: t("upload.uploadedLinks.pureLink.title"),
  },
  {
    type: "markdown",
    links: uploadedLinks.value.map((link) => `![${link.name}](${link.link})`),
    label: t("upload.uploadedLinks.markdown.title"),
  },
]);
</script>
