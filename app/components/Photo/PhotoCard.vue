<template>
  <div class="relative group">
    <PhotoCardImageDisplay
      ref="imageDisplay"
      :s3-key="key"
      :class="selected && 'scale-90 rounded-lg'"
    />
    <div v-if="imageDisplay?.imageLoaded" class="absolute inset-0">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 hover-to-show"
        style="
          background-image: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.5),
            transparent 50px,
            transparent
          );
        "
        @click="
          () => {
            if (selectMode) selected = !selected;
            else modalOpen = true;
          }
        "
      ></div>
      <UCheckbox
        v-model="selected"
        class="absolute top-4 left-4 hover-to-show"
        :class="selected && '!opacity-100 !pointer-events-auto'"
        :ui="{
          container: 'h-6',
          base: 'w-6 h-6',
        }"
      />
      <div class="hover-to-show absolute left-4 bottom-4">
        <PhotoCardInfo :photo="photo" mode="hover" :ui="{ wrapper: 'h-5' }">
          <UIcon
            name="i-mingcute-information-line"
            class="text-white w-5 h-5"
          />
        </PhotoCardInfo>
      </div>
      <UButton
        :aria-label="selectMode ? 'Open fullscreen' : 'Copy Link'"
        :icon="
          selectMode ? 'i-mingcute-zoom-in-line' : 'i-mingcute-copy-2-line'
        "
        color="gray"
        class="absolute bottom-4 right-4 hover-to-show"
        @click="
          () => {
            if (selectMode) modalOpen = true;
            else copy(photo);
          }
        "
      />
      <UModal v-model="modalOpen" fullscreen>
        <PhotoCardModal
          v-model="selected"
          :photo="photo"
          :close-modal="() => (modalOpen = false)"
        />
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Photo } from "~/types";
const props = defineProps<{
  photo: Photo;
  disabled?: boolean;
  selectMode: boolean;
}>();

const imageDisplay = useTemplateRef("imageDisplay");

const key = computed(() => props.photo.Key);
const selected = ref(false);
defineExpose({
  key,
  selected,
});

const modalOpen = ref(false);

const toast = useToast();
const { t } = useI18n();
function copy(photo: Photo) {
  navigator.clipboard.writeText(photo.url);
  toast.add({ title: t("photos.message.copyLink.title") });
}
</script>

<style scoped lang="postcss">
@tailwind utilities;
@layer utilities {
  .hover-to-show {
    @apply pointer-events-none group-hover:pointer-events-auto focus-visible:pointer-events-auto
     opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 transition-opacity duration-200;
  }
}
.v-enter-active {
  transition: opacity 0.2s ease;
}

.v-enter-from {
  opacity: 0;
}
</style>
