<template>
  <UPopover mode="hover" class="max-w-full">
    <div
      class="flex flex-row justify-between gap-2 p-2 rounded-md group bg-gray-200/50 dark:bg-gray-800/80 hover:bg-gray-500/15 hover:text-primary-500 dark:hover:text-primary-400 transition-colors max-w-full cursor-default"
    >
      <span
        class="space-x-2 max-w-full overflow-hidden whitespace-nowrap text-ellipsis"
      >
        <UIcon
          name="i-mingcute-pic-line"
          class="align-middle -translate-y-[0.1em]"
        />
        <span>{{ file.name }}</span>
      </span>
      <span
        class="absolute right-2 top-1/2 -translate-y-1/2 transition-all group-hover:opacity-100 opacity-0 flex gap-[0.125rem]"
      >
        <UButton
          icon="i-mingcute-edit-2-line"
          size="xs"
          color="white"
          variant="solid"
          class="bg-none group-hover:bg-white group-hover:dark:bg-gray-800 rounded-lg transition-all"
          @click="modalOpen = true"
        />
        <UButton
          size="xs"
          color="white"
          variant="solid"
          icon="i-heroicons-x-mark-20-solid"
          class="bg-none group-hover:bg-white group-hover:dark:bg-gray-800 rounded-lg transition-all"
          @click="uploadStore.remove(index)"
        />
      </span>
    </div>
    <template #panel>
      <div class="p-4 flex flex-col gap-4">
        <UploadPreviewInfo :index="index" />
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
  <UModal v-model="modalOpen">
    <UCard>
      <UploadPreviewInfo :index="index" class="mb-4" />
      <div class="flex flex-col gap-4">
        <UFormGroup :label="$t('settings.app.keyTemplate.title')">
          <UInput v-model="keyTemplate" />
        </UFormGroup>
        <!--convert-->
        <UFormGroup
          :label="$t('settings.app.convert.title')"
          :description="$t('settings.app.convert.description')"
          name="convertType"
        >
          <USelectMenu
            v-model="uploadStore.configs[index].convertType"
            :options="Array.from(convertTypes)"
          />
        </UFormGroup>
        <!--compress-->
        <div>
          <div class="flex content-center items-center justify-between text-sm">
            {{ $t("settings.app.compress.title") }}
          </div>
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            {{ $t("settings.app.compress.description") }}
          </p>
          <div class="flex flex-row gap-2 mt-1">
            <UFormGroup name="compressionMaxSize" class="w-full">
              <UInput
                v-model="uploadStore.configs[index].compressionMaxSize"
                :placeholder="$t('settings.app.compress.options.maxSize.title')"
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
                v-model="uploadStore.configs[index].compressionMaxWidthOrHeight"
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
</template>

<script setup lang="ts">
import { convertTypes } from "~/types";
const uploadStore = useUploadStore();
const props = defineProps<{ index: number }>();

const { index } = toRefs(props);
const file = computed(() => uploadStore.getFile(index.value));

const keyTemplate = computed({
  get: () => uploadStore.configs[index.value].keyTemplate,
  set: (v) => (uploadStore.configs[index.value].keyTemplate = v),
});

const modalOpen = ref(false);

const previewImage = computed(() => {
  if (!file.value) return "";
  return URL.createObjectURL(file.value);
});
onBeforeUnmount(() => {
  URL.revokeObjectURL(previewImage.value);
});
</script>
