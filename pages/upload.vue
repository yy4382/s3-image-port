<template>
  <UContainer class="space-y-8 max-w-xl w-full">
    <UContainer class="!px-0">
      <FileUploader v-model:uploadedLinks="uploadedLinks" class="w-full" />
    </UContainer>
    <UTabs
      v-if="uploadedLinksFormatted.length > 0"
      :items="[
        { slot: 'links', label: $t('upload.uploadedLinks.pureLink.title') },
        { slot: 'markdown', label: $t('upload.uploadedLinks.markdown.title') },
      ]"
    >
      <template #links>
        <UCard>
          <ul class="space-y-3">
            <li v-for="link in uploadedLinksFormatted" :key="link.link">
              <UseClipboard v-slot="{ copy }" :source="link.link">
                <UButton
                  color="black"
                  variant="link"
                  class="w-full"
                  @click="
                    copy() && toast.add({ title: $t('upload.message.copied') })
                  "
                >
                  <span class="truncate">{{ link.link }}</span>
                </UButton>
              </UseClipboard>
            </li>
          </ul>
        </UCard>
      </template>
      <template #markdown>
        <UCard>
          <ul class="space-y-3">
            <li v-for="link in uploadedLinksFormatted" :key="link.markdown">
              <UseClipboard v-slot="{ copy }" :source="link.markdown">
                <UButton
                  color="black"
                  variant="link"
                  class="w-full"
                  @click="
                    copy() && toast.add({ title: $t('upload.message.copied') })
                  "
                >
                  <span class="truncate">{{ link.markdown }}</span>
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
const uploadedLinksFormatted = computed(() =>
  uploadedLinks.value.map((link) => ({
    link: link.link,
    markdown: `![${link.name}](${link.link})`,
  })),
);
</script>
