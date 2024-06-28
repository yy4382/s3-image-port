<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm items-center inline-flex">
      <Icon name="i-mingcute-key-2-line" class="shrink-0 mr-2" />
      <span :title="keyStr" class="truncate block">
        Upload Path: {{ keyStr }}
      </span>
    </p>
    <p class="text-sm items-center inline-flex">
      <Icon name="i-mingcute-file-line" class="shrink-0 mr-2" />
      <span>Processed Size:&nbsp;</span>
      <USkeleton v-if="isProcessing" class="w-12 h-5" />
      <span v-else class="truncate block">
        {{ processedSize === undefined ? "??" : processedSize }}
      </span>
      <UButton
        icon="i-mingcute-refresh-2-line"
        variant="link"
        size="xs"
        @click="
          isProcessing = true;
          $emit('processFile', () => {
            isProcessing = false;
          });
        "
      />
    </p>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  keyStr: string;
  processedSize: string | undefined;
}>();
defineEmits(["processFile"]);
const isProcessing = ref(false);
</script>
