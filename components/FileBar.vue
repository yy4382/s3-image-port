<template>
  <UPopover mode="hover">
    <div
      class="flex flex-row justify-between gap-2 p-2 rounded-md hover:bg-gray-500/15 hover:text-primary-500 dark:hover:text-primary-400 transition-colors group"
    >
      <div class="flex flex-row gap-2">
        <span class="flex flex-col justify-center">
          <UIcon name="i-mingcute-pic-line" />
        </span>
        <span class="flex flex-col justify-center">{{ props.file?.name }}</span>
      </div>
      <span class="flex flex-col justify-center">
        <UButton
          :padded="false"
          color="gray"
          variant="link"
          icon="i-heroicons-x-mark-20-solid"
          class="group-hover:opacity-100 opacity-0 transition-opacity"
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
</script>
