import { defineStore, acceptHMRUpdate } from "pinia";
import type { UploadFileConfig, ConvertSettings } from "~/types";
type FinishEachCb = (key: string, name: string, success: boolean) => void;
export const useUploadStore = defineStore("upload", () => {
  const settings = useSettingsStore();

  const files = ref<File[]>([]);
  const configs = ref<UploadFileConfig[]>([]);
  const keys = ref<string[]>([]);
  const processedFiles = ref<(File | null)[]>([]);

  const convertSettings = computed(
    () =>
      ({
        convertType: settings.app.convertType,
        compressionMaxSize: settings.app.compressionMaxSize,
        compressionMaxWidthOrHeight: settings.app.compressionMaxWidthOrHeight,
      }) satisfies ConvertSettings,
  );

  watch(convertSettings, (newVal, oldVal) => {
    configs.value.forEach((config, index) => {
      if (
        config.convertType === oldVal.convertType &&
        config.compressionMaxSize === oldVal.compressionMaxSize &&
        config.compressionMaxWidthOrHeight ===
          oldVal.compressionMaxWidthOrHeight
      ) {
        configs.value[index] = { ...newVal, keyTemplate: config.keyTemplate };
      }
    });
  });

  watch(
    () => settings.app.keyTemplate,
    (newVal, oldVal) => {
      configs.value.forEach((config, index) => {
        if (config.keyTemplate === oldVal) {
          config.keyTemplate = newVal;
          keys.value[index] = genKey(
            files.value[index],
            settings.app.convertType,
            newVal,
          );
        }
      });
    },
  );
  watch(
    () =>
      configs.value.map((config) => [config.keyTemplate, config.convertType]),
    (newPartialConfigs, oldPartialConfigs) => {
      if (oldPartialConfigs.length === 0)
        oldPartialConfigs = Array(4).fill([
          settings.app.keyTemplate,
          settings.app.convertType,
        ]);
      if (newPartialConfigs.length !== oldPartialConfigs.length) return;
      keys.value = newPartialConfigs.map(
        ([keyTemplate, convertType], index) => {
          if (
            keyTemplate === oldPartialConfigs[index][0] &&
            convertType === oldPartialConfigs[index][1]
          ) {
            return keys.value[index];
          } else {
            return genKey(files.value[index], convertType, keyTemplate);
          }
        },
      );
    },
    { deep: true },
  );

  const keysAreDifferent = computed(() => {
    for (let i = 0; i < keys.value.length; i++) {
      for (let j = i + 1; j < keys.value.length; j++) {
        if (keys.value[i] === keys.value[j]) {
          return false;
        }
      }
    }
    return true;
  });

  const push = (newFiles: File[]) => {
    newFiles.map((newFile) => {
      const index = files.value.findIndex((file) => isSameFile(file, newFile));
      if (index === -1) {
        files.value.push(newFile);
        keys.value.push(
          genKey(newFile, settings.app.convertType, settings.app.keyTemplate),
        );
        processedFiles.value.push(null);
        configs.value.push({
          ...convertSettings.value,
          keyTemplate: settings.app.keyTemplate,
        } satisfies UploadFileConfig);
      }
    });
  };

  const processFile = async (index: number, force?: boolean) => {
    if (processedFiles.value[index] === null || force) {
      processedFiles.value[index] = await compressAndConvert(
        files.value[index],
        configs.value[index],
      );
    }
  };

  const upload = async (finishedEachCb: FinishEachCb) => {
    await Promise.all(
      files.value.map(async (file, index) => {
        try {
          debug("Uploaded", keys.value[index]);
          const key = keys.value[index];
          await processFile(index, true);
          await uploadObj(processedFiles.value[index]!, key, settings.s3);
          finishedEachCb(key, file.name, true);
        } catch (e) {
          console.error(e);
          finishedEachCb(keys.value[index], file.name, false);
        }
      }),
    );
  };

  const remove = (index: number) => {
    if (index !== -1) {
      files.value.splice(index, 1);
      keys.value.splice(index, 1);
      processedFiles.value.splice(index, 1);
      configs.value.splice(index, 1);
    }
  };
  const length = computed(() => files.value.length);

  const reset = () => {
    files.value = [];
    keys.value = [];
    processedFiles.value = [];
    configs.value = [];
  };

  return {
    files,
    keys,
    configs,
    keysAreDifferent,
    length,
    push,
    upload,
    remove,
    reset,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUploadStore, import.meta.hot));
}

function isSameFile(file1: File, file2: File) {
  return (
    file1.name === file2.name &&
    file1.size === file2.size &&
    file1.lastModified === file2.lastModified
  );
}
