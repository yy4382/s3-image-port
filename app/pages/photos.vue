<template>
  <UContainer class="w-full space-y-4">
    <ClientOnly>
      <div class="w-full flex flex-col-reverse gap-4">
        <div id="display-settings"></div>
        <div class="flex gap-4 justify-end">
          <PhotoDisplayOptions />
        </div>
      </div>
      <PhotoGrid />
      <Teleport to="body">
        <div class="fixed bottom-4 left-4 z-50">
          <UCard :ui="{ body: { padding: '!p-2' }, shadow: 'shadow-lg' }">
            <PhotoToolbar />
          </UCard>
        </div>
      </Teleport>
    </ClientOnly>
  </UContainer>
</template>
