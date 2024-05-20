<template>
  <UCarousel
    v-slot="{ item }"
    :items="items"
    :ui="{
      item: 'h-80 w-auto',
    }"
    class="max-w-2xl rounded-lg overflow-clip"
  >
    <UploadPreviewImage :image="item" />
  </UCarousel>
</template>

<script lang="ts" setup>
const props = defineProps<{
  images: File[] | undefined;
}>();

const items = computed(() => {
  if (!props.images) return [];
  return props.images;
});
</script>
