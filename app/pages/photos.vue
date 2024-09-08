<template>
  <UContainer class="w-full space-y-4">
    <ClientOnly>
      <div class="w-full flex flex-col-reverse gap-4">
        <div id="display-settings"></div>
        <div class="flex gap-4 justify-between">
          <PhotoToolbar />
          <PhotoDisplayOptions />
        </div>
      </div>
      <PhotoGrid />
    </ClientOnly>
  </UContainer>
</template>
