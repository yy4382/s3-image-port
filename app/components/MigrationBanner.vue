<template>
  <div
    v-if="visible"
    class="w-full bg-primary-50 dark:bg-primary-950 border-b border-primary-200 dark:border-primary-800 px-4 py-2"
  >
    <UContainer class="flex items-center justify-between gap-2">
      <p class="text-sm text-primary-800 dark:text-primary-200 flex-1 text-center">
        {{ $t("migrationBanner.message") }}
        <ULink
          href="https://imageport.app"
          target="_blank"
          class="font-semibold underline hover:opacity-80"
        >imageport.app</ULink>
        {{ $t("migrationBanner.guide") }}
        <ULink
          href="https://docs.imageport.app/docs/migrate-from-v1"
          target="_blank"
          class="font-semibold underline hover:opacity-80"
        >{{ $t("migrationBanner.guideLink") }}</ULink>
      </p>
      <UButton
        icon="i-mingcute-close-fill"
        size="xs"
        color="primary"
        variant="ghost"
        square
        :aria-label="$t('migrationBanner.dismiss')"
        @click="dismiss"
      />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const visible = ref(true);

onMounted(() => {
  visible.value = localStorage.getItem("migration-banner-dismissed") !== "true";
});

function dismiss() {
  visible.value = false;
  localStorage.setItem("migration-banner-dismissed", "true");
}
</script>
