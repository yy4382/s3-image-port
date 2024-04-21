<template>
  <UContainer>
    <UCard class="w-96 m-auto">
      <template #header>
        <h2>Settings</h2>
      </template>
      <UTabs
        :items="[
          { key: 's3', label: 'S3 Settings' },
          { key: 'app', label: 'App Settings' },
        ]"
      >
        <template #item="{ item }">
          <SettingsS3 v-if="item.key === 's3'" />
          <SettingsApp v-if="item.key === 'app'" />
        </template>
      </UTabs>
    </UCard>
  </UContainer>
</template>
