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
        <span>{{ props.file?.name }}</span>
      </span>
      <span
        class="absolute right-2 top-1/2 -translate-y-1/2 bg-none group-hover:bg-white group-hover:dark:bg-gray-800 rounded-lg transition-all group-hover:opacity-100 opacity-0"
      >
        <UButton
          size="xs"
          color="white"
          variant="solid"
          icon="i-heroicons-x-mark-20-solid"
          class=""
          @click="$emit('remove', file)"
        />
      </span>
    </div>
    <template #panel>
      <div class="p-2">
        <img :src="previewImage" class="w-72" />
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
const props = defineProps({
  file: File,
});
defineEmits(["remove"]);
const previewImage = computed(() => {
  if (!props.file) return "";
  return URL.createObjectURL(props.file);
});
onBeforeUnmount(() => {
  URL.revokeObjectURL(previewImage.value);
});
</script>
