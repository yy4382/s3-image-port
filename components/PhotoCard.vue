<template>
  <UCard>
    <img :src="photo.url" preview class="w-fit m-auto overflow-visible" />
    <template #footer>
      <div class="flex justify-between items-center gap-2">
        <div class="flex flex-col space-y-1">
          <div class="text-xs items-center inline-flex">
            <Icon name="i-mingcute-time-line" class="mr-2" />
            {{ DateTime.fromISO(photo.LastModified).toFormat("yyyy-LL-dd") }}
          </div>
          <div class="text-xs items-center inline-flex">
            <Icon name="i-mingcute-key-2-line" class="mr-2" />
            {{ photo.Key }}
          </div>
        </div>
        <div class="flex gap-2">
          <UButton
            aria-label="Copy Link"
            icon="i-mingcute-copy-2-line"
            @click="copy(photo, $event)"
          />
          <UPopover overlay>
            <UButton
              aria-label="Delete"
              icon="i-mingcute-delete-3-line"
              :disabled="disabled"
            />
            <template #panel="{ close }">
              <!--TODO: optimize text style-->
              <div class="p-5 space-y-2">
                <div class="font-semibold">
                  {{ $t("photos.photoCard.deleteButton.confirm.title") }}
                </div>
                <div class="flex flex-row-reverse gap-2">
                  <UButton
                    size="xs"
                    :label="
                      $t('photos.photoCard.deleteButton.confirm.actions.cancel')
                    "
                    @click="close()"
                  />
                  <UButton
                    size="xs"
                    :label="
                      $t(
                        'photos.photoCard.deleteButton.confirm.actions.confirm'
                      )
                    "
                    color="red"
                    @click="
                      $emit('deletePhoto', photo.Key);
                      close();
                    "
                  />
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { DateTime } from "luxon";
import { type Photo } from "../types";
defineProps<{
  photo: Photo;
  disabled: boolean;
}>();
const toast = useToast();
const { t } = useI18n();
function copy(photo: Photo, event: MouseEvent) {
  navigator.clipboard.writeText(photo.url);
  toast.add({ title: t("photos.message.copyLink.title") });
}
</script>
