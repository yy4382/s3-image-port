<template>
  <UContainer class="w-full">
    <nav class="flex items-center justify-between h-16">
      <div class="flex-1 justify-start flex items-center gap-2">
        <Icon
          name="i-mingcute-photo-album-fill"
          class="text-3xl text-primary"
        />
        <span class="text-xl font-bold hidden md:block">S3 Image Port</span>
      </div>
      <div class="flex space-x-4">
        <ULink
          to="/"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >Upload</ULink
        >
        <ULink
          to="/photos"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >Photos</ULink
        >
        <ULink
          to="/settings"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >Settings</ULink
        >
      </div>
      <div class="flex-1 flex justify-end">
        <UButton
          icon="i-mingcute-github-fill"
          size="md"
          color="primary"
          square
          variant="ghost"
          target="_blank"
          to="https://github.com/yy4382/s3-image-port"
        />
      </div>
    </nav>
  </UContainer>
</template>
