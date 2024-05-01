<template>
  <UContainer>
    <UCard class="w-96 m-auto">
      <template #header>
        <h2>{{ $t("settings.title") }}</h2>
      </template>
      <UTabs
        :items="[
          { key: 's3', label: $t('settings.s3.title') },
          { key: 'app', label: $t('settings.app.title') },
        ]"
      >
        <template #item="{ item }">
          <ClientOnly>
            <SettingsS3 v-if="item.key === 's3'" />
            <SettingsApp v-if="item.key === 'app'" />
          </ClientOnly>
        </template>
      </UTabs>
    </UCard>
  </UContainer>
</template>
