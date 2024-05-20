<template>
  <img :src="imageUrl" />
  <!-- !TODO add key preview, compressed size preview, delete button, etc.-->
</template>

<script lang="ts" setup>
const props = defineProps<{
  image: File;
}>();
const imageUrl = computed(() => URL.createObjectURL(props.image));
onBeforeUnmount(() => URL.revokeObjectURL(imageUrl.value));
</script>
