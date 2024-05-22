<template>
  <UTabs
    v-model="selectedMode"
    :items="items"
    :ui="{
      wrapper: 'space-y-0',
      list: {
        height: 'h-9',
        tab: {
          base: 'w-7',
          height: 'h-7',
        },
      },
    }"
  >
    <template #default="{ item, selected }">
      <UIcon
        :name="item.icon"
        class="w-5 h-5 flex-shrink-0"
        :class="selected && 'text-primary-500'"
      />
    </template>
    <template #item></template>
  </UTabs>
</template>

<script lang="ts" setup>
import { useColorMode } from "@vueuse/core";
const { system: systemColorMode, store: colorMode } = useColorMode({
  emitAuto: true,
});
const items = [
  { icon: "i-mingcute-sun-fill", label: "light" },
  { icon: "i-mingcute-imac-fill", label: "auto" },
  { icon: "i-mingcute-moon-fill", label: "dark" },
];
const selectedMode = computed({
  get() {
    return items.findIndex((item) => item.label === colorMode.value);
  },
  set(index) {
    toggleTheme(items[index].label);
  },
});
const toggleTheme = (nextColorMode: string) => {
  const currentColor =
    colorMode.value === "auto" ? systemColorMode.value : colorMode.value;
  const nextColor =
    nextColorMode === "auto" ? systemColorMode.value : nextColorMode;
  const willChangeToDark = nextColor === "dark";
  if (currentColor === nextColor) {
    // @ts-expect-error known set of string to a union type
    colorMode.value = nextColorMode;
    return;
  }

  // 兼容性处理
  if (!document.startViewTransition) {
    // @ts-expect-error known set of string to a union type
    colorMode.value = nextColorMode;
    return;
  }
  const transition = document.startViewTransition(async () => {
    // @ts-expect-error known set of string to a union type
    colorMode.value = nextColorMode;
  });

  transition.ready.then(() => {
    const clipPath = [
      `polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)`,
      `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
    ];
    document.documentElement.animate(
      {
        clipPath: willChangeToDark ? clipPath : [...clipPath].reverse(),
      },
      {
        duration: 250,
        easing: "ease-in",
        pseudoElement: willChangeToDark
          ? "::view-transition-new(root)"
          : "::view-transition-old(root)",
      }
    );
  });
};
</script>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

.dark::view-transition-old(root) {
  z-index: 1;
}
.dark::view-transition-new(root) {
  z-index: 999;
}

::view-transition-old(root) {
  z-index: 999;
}
::view-transition-new(root) {
  z-index: 1;
}
</style>
