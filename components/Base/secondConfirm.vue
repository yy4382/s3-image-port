<template>
  <UPopover overlay>
    <slot />
    <template #panel="{ close }">
      <div class="flex p-4 gap-3 items-center">
        <div class="text-sm font-medium text-gray-900 dark:text-white">
          {{ askText || $t("general.message.askConfirm") }}
        </div>
        <div class="flex items-center gap-2 flex-shrink-0 mt-0">
          <UButton
            size="xs"
            :label="$t('general.actions.cancel')"
            color="gray"
            @click="close()"
          />
          <UButton
            size="xs"
            :label="$t('general.actions.confirm')"
            :color="danger ? 'red' : 'primary'"
            @click="
              action();
              close();
            "
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script lang="ts" setup>
defineProps<{
  action: () => void;
  danger?: boolean;
  askText?: string;
}>();
</script>
