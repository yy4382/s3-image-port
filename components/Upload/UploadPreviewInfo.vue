<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm items-center inline-flex">
      <Icon name="i-mingcute-key-2-line" class="shrink-0 mr-2" />
      <span :title="key" class="truncate block"> Upload Path: {{ key }} </span>
    </p>
    <p class="text-sm items-center inline-flex">
      <Icon name="i-mingcute-file-line" class="shrink-0 mr-2" />
      <span>Processed Size:&nbsp;</span>
      <USkeleton v-if="isProcessing" class="w-12 h-5" />
      <span v-else class="truncate block">
        {{
          uploadStore.processedSize[index] === undefined
            ? "??"
            : uploadStore.processedSize[index]
        }}
      </span>
      <UButton
        icon="i-mingcute-refresh-2-line"
        variant="link"
        size="xs"
        @click="
          isProcessing = true;
          uploadStore
            .processFile(index, true)
            .finally(() => (isProcessing = false));
        "
      />
    </p>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  index: number;
}>();
const { index } = toRefs(props);

const isProcessing = ref(false);
const uploadStore = useUploadStore();
const key = computed(() => uploadStore.getKey(index.value));
</script>

<style></style>
