<template>
  <div class="min-h-screen flex flex-col dark:bg-surface-800 gap-4">
    <Toast />
    <Menubar :model="items">
      <template #item="{ item, props }">
        <router-link
          v-if="item.route"
          v-slot="{ href, navigate }"
          :to="item.route"
          custom
        >
          <a v-ripple :href="href" v-bind="props.action" @click="navigate">
            <span :class="item.icon" />
            <span class="ml-2">{{ item.label }}</span>
          </a>
        </router-link>
        <a
          v-else
          v-ripple
          :href="item.url"
          :target="item.target"
          v-bind="props.action"
        >
          <span :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
        </a>
      </template>
      <template #end>
        <Button
          label="Check server"
          icon="pi pi-refresh"
          @click="checkHeartbeat"
          raised
          text
        />
      </template>
    </Menubar>
    <NuxtPage class="flex-grow" />
    <FooterComp />
  </div>
</template>

<script setup>
import { useToast } from "primevue/usetoast";
const toast = useToast();
async function checkHeartbeat() {
  const response = await $fetch("/api/heartbeat");
  if (response.status !== "ok") {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: response.message,
      life: 3000,
    });
  } else {
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Server runtime config is ok!",
      life: 3000,
    });
  }
}
onMounted(async () => {
  await checkHeartbeat();
});
const items = ref([
  {
    label: "Home",
    icon: "pi pi-home",
    route: "/",
  },
  {
    label: "Photos",
    icon: "pi pi-star",
    route: "/photos",
  },
  {
    label: "Settings",
    icon: "pi pi-star",
    route: "/settings",
  },
]);
</script>

<style>
@import url("~/assets/css/base.css");
</style>
