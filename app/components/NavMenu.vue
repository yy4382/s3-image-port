<template>
  <UContainer class="w-full">
    <nav class="flex items-center justify-between h-16 gap-2" role="banner">
      <ULink
        class="flex-1 justify-start flex items-center gap-2 select-none"
        as="div"
        :to="
          useSettingsStore().app.noLongerShowRootPage
            ? undefined
            : localePath('/')
        "
        :aria-label="$t('a11y.nav.logo')"
      >
        <img
          src="~/../public/favicon.svg"
          class="h-6 pointer-events-none"
          alt="favicon"
          aria-hidden="true"
        />
        <span class="text-xl font-bold hidden md:block">S3 Image Port</span>
      </ULink>
      <div class="flex space-x-4 font-semibold">
        <ULink
          :to="localePath('/upload')"
          class="flex flex-row items-center gap-1"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <UIcon
            name="i-mingcute-upload-3-fill"
            class="text-2xl md:text-base"
            style="view-transition-name: nav-upload"
          />
          <span class="hidden md:block">{{ $t("upload.title") }}</span>
        </ULink>
        <ULink
          :to="localePath('/photos')"
          class="flex flex-row items-center gap-1"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <UIcon
            name="i-mingcute-photo-album-2-fill"
            class="text-2xl md:text-base"
            style="view-transition-name: nav-gallery"
          />
          <span class="hidden md:block"> {{ $t("photos.title") }}</span>
        </ULink>
        <ULink
          :to="localePath('/settings')"
          class="flex flex-row items-center gap-1"
          :active="useRoute().path.startsWith(localePath('/settings'))"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <UIcon
            name="i-mingcute-settings-3-fill"
            class="text-2xl md:text-base"
            style="view-transition-name: nav-settings"
          />
          <span class="hidden md:block">{{ $t("settings.title") }} </span>
        </ULink>
      </div>
      <div class="flex-1 flex justify-end items-center gap-1">
        <div aria-hidden="true">
          <ClientOnly>
            <UPopover v-if="smallerThanMd">
              <UButton
                :icon="icon"
                size="md"
                color="primary"
                square
                variant="ghost"
              />
              <template #panel>
                <ThemeSwitcher />
              </template>
            </UPopover>
            <ThemeSwitcher v-else />
          </ClientOnly>
        </div>
        <UPopover :aria-label="$t('a11y.nav.language-switcher')">
          <UButton
            icon="i-mingcute-translate-2-fill"
            size="md"
            color="primary"
            square
            variant="ghost"
            role="button"
            :aria-label="$t('a11y.nav.language-switcher')"
          />
          <template #panel>
            <div
              class="flex flex-col p-3 gap-2"
              role="listbox"
              :aria-label="$t('a11y.nav.language-switcher')"
            >
              <UButton
                v-for="locale in locales"
                :key="locale.code"
                :padded="false"
                variant="link"
                class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:no-underline"
                :disabled="$i18n.locale === locale.code"
                :aria-label="locale.name"
                role="option"
                @click.prevent.stop="setLocale(locale.code)"
              >
                {{ locale.name }}
              </UButton>
            </div>
          </template>
        </UPopover>

        <UButton
          icon="i-mingcute-github-fill"
          size="md"
          color="primary"
          square
          variant="ghost"
          target="_blank"
          to="https://github.com/yy4382/s3-image-port"
          :aria-label="$t('a11y.nav.github')"
        />
      </div>
    </nav>
  </UContainer>
</template>

<script setup lang="ts">
import { useColorMode, breakpointsTailwind } from "@vueuse/core";
const { locales, setLocale } = useI18n();
const localePath = useLocalePath();
const { store: colorMode, system: SystemColorMode } = useColorMode({
  emitAuto: true,
});
const breakpoints = useBreakpoints(breakpointsTailwind);
const smallerThanMd = breakpoints.smallerOrEqual("md");

const icon = computed(() => {
  switch (colorMode.value) {
    case "dark":
      return "i-mingcute-moon-fill";
    case "light":
      return "i-mingcute-sun-fill";
    case "auto":
      return SystemColorMode.value === "dark"
        ? "i-mingcute-moon-fill"
        : "i-mingcute-sun-fill";
    default:
      return "i-mingcute-sun-fill";
  }
});
</script>
