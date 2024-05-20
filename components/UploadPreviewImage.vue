<template>
  <!-- !TODO add key preview, compressed size preview, delete button, etc.-->
  <div class="w-80">
    <div
      class="relative inline-block"
      @mouseover="maskVisible = true"
      @mouseleave="maskVisible = false"
    >
      <NuxtImg :src="imageUrl" />
      <div
        v-if="maskVisible"
        class="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-black bg-opacity-50"
      >
        <p>hello</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
onBeforeUnmount(() => URL.revokeObjectURL(imageUrl.value));

const props = defineProps<{
  image: File;
}>();

const imageUrl = computed(() => URL.createObjectURL(props.image));

const maskVisible = ref(false);
</script>
