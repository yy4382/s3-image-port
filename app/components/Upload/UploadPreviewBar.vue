<template>
  <div class="w-full">
    <div
      class="w-full flex flex-row justify-between items-center gap-2 p-3 rounded-md bg-gray-200/50 dark:bg-gray-800/80 hover:bg-gray-500/15 hover:text-primary-500 dark:hover:text-primary-400 transition-colors max-w-full cursor-default"
    >
      <UPopover mode="hover" class="flex-grow min-w-0">
        <span
          class="space-x-2 max-w-full overflow-hidden whitespace-nowrap text-ellipsis"
        >
          <UIcon
            name="i-mingcute-pic-line"
            class="align-middle -translate-y-[0.1em]"
          />
          <span>{{ file.name }}</span>
        </span>
        <template #panel>
          <div class="p-4 flex flex-col gap-4">
            <UploadPreviewInfo
              :key-str="key"
              :processed-size
              @process-file="onProcessFile"
            />
            <UButton
              icon="i-mingcute-edit-2-line"
              color="white"
              variant="solid"
              block
              @click="modalOpen = true"
            >
              Edit Config
            </UButton>
            <img :src="previewImage" class="w-72" />
          </div>
        </template>
      </UPopover>
      <span class="transition-all flex gap-1 flex-shrink-0">
        <UButton
          icon="i-mingcute-edit-2-line"
          size="sm"
          color="white"
          variant="solid"
          @click="modalOpen = true"
        />
        <UButton
          size="sm"
          color="white"
          variant="solid"
          icon="i-heroicons-x-mark-20-solid"
          @click="$emit('deleteFile')"
        />
      </span>
    </div>

    <UModal v-model="modalOpen">
      <UCard>
        <UploadPreviewInfo
          :key-str="key"
          :processed-size
          class="mb-4"
          @process-file="onProcessFile"
        />
        <div class="flex flex-col gap-4">
          <UFormGroup :label="$t('settings.app.keyTemplate.title')">
            <UInput v-model="config.keyTemplate" />
          </UFormGroup>
          <!--convert-->
          <UFormGroup
            :label="$t('settings.app.convert.title')"
            :description="$t('settings.app.convert.description')"
            name="convertType"
          >
            <USelectMenu
              v-model="config.convertType"
              :options="Array.from(convertTypes)"
            />
          </UFormGroup>
          <!--compress-->
          <div>
            <div
              class="flex content-center items-center justify-between text-sm"
            >
              {{ $t("settings.app.compress.title") }}
            </div>
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              {{ $t("settings.app.compress.description") }}
            </p>
            <div class="flex flex-row gap-2 mt-1">
              <UFormGroup name="compressionMaxSize" class="w-full">
                <UInput
                  v-model="config.compressionMaxSize"
                  :placeholder="
                    $t('settings.app.compress.options.maxSize.title')
                  "
                  type="number"
                  min="0"
                >
                  <template #trailing>
                    <span class="text-gray-500 dark:text-gray-400 text-xs"
                      >MB</span
                    >
                  </template>
                </UInput>
              </UFormGroup>
              <UFormGroup name="compressionMaxWidthOrHeight" class="w-full">
                <UInput
                  v-model="config.compressionMaxWidthOrHeight"
                  :placeholder="
                    $t('settings.app.compress.options.maxWidthOrHeight.title')
                  "
                  type="number"
                  min="1"
                >
                  <template #trailing>
                    <span class="text-gray-500 dark:text-gray-400 text-xs"
                      >px</span
                    >
                  </template>
                </UInput>
              </UFormGroup>
            </div>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { convertTypes } from "~/types";
import type { FileUploadSettings } from "~/types";
const settingsStore = useSettingsStore();

defineEmits(["deleteFile"]);

const props = defineProps<{ file: File }>();

const { file } = toRefs(props);
const config = ref<FileUploadSettings>({
  compressionMaxSize: settingsStore.app.compressionMaxSize,
  compressionMaxWidthOrHeight: settingsStore.app.compressionMaxWidthOrHeight,
  convertType: settingsStore.app.convertType,
  keyTemplate: settingsStore.app.keyTemplate,
});

const key = computed(() =>
  genKey(file.value, {
    keyTemplate: config.value.keyTemplate,
    type: config.value.convertType,
  }),
);

const processedFile = shallowRef<File | null>(null);

const processedSize = computed(() =>
  processedFile.value?.size
    ? humanFileSize(processedFile.value.size)
    : undefined,
);

const processFile = async () => {
  processedFile.value = await compressAndConvert(file.value, config.value);
};

const onProcessFile = async (callback: () => void) => {
  await processFile();
  callback();
};

type FinishEachCb = (key: string, name: string, success: boolean) => void;
const upload = async (finishedEachCb?: FinishEachCb) => {
  try {
    debug("Uploaded", key.value);
    await processFile();
    await new ImageS3Client(settingsStore.s3).upload(
      processedFile.value!,
      key.value,
    );
    if (finishedEachCb) finishedEachCb(key.value, file.value.name, true);
    return { key: key.value, name: file.value.name, success: true };
  } catch (e) {
    console.error(e);
    if (finishedEachCb) finishedEachCb(key.value, file.value.name, false);
    return { key: key.value, name: file.value.name, success: false };
  }
};

defineExpose({ key, upload });

const modalOpen = ref(false);

const previewImage = computed(() => {
  if (!file.value) return "";
  return URL.createObjectURL(file.value);
});
onBeforeUnmount(() => {
  URL.revokeObjectURL(previewImage.value);
});
</script>
