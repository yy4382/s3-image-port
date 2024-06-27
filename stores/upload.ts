import { defineStore, acceptHMRUpdate } from "pinia";
import type { UploadFileConfig, ConvertSettings } from "~/types";
type FinishEachCb = (key: string, name: string, success: boolean) => void;

export const useUploadStore = defineStore("upload", () => {
  const settings = useSettingsStore();

  const files = ref<File[]>([]);
  const configs = ref<UploadFileConfig[]>([]);
  const keys = ref<string[]>([]);
  const processedFiles = ref<(File | null)[]>([]);

  /**
   * Represents the convert settings in overall settings.
   */
  const convertSettings = computed(
    () =>
      ({
        convertType: settings.app.convertType,
        compressionMaxSize: settings.app.compressionMaxSize,
        compressionMaxWidthOrHeight: settings.app.compressionMaxWidthOrHeight,
      }) satisfies ConvertSettings,
  );

  /**
   * This watcher is used to update the convert settings of each file when the overall convert settings change.
   */
  watch(convertSettings, (newVal, oldVal) => {
    configs.value.forEach((config, index) => {
      // Only update the convert settings if the settings are the same as the old value,
      // which indicates that the settings were not specifically set for this file.
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

  /**
   * This watcher is used to update the keys when the key template in overall settings changes.
   */
  watch(
    () => settings.app.keyTemplate,
    (newVal, oldVal) => {
      configs.value.forEach((config, index) => {
        // Only update the key if the key template is the same as the old value,
        // which indicates that the template was not specifically set for this file.
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

  /**
   * This watcher is used to update the keys when the convert type or key template changes.
   */
  watch(
    () =>
      configs.value.map(
        (config) =>
          [config.keyTemplate, config.convertType] as [string, string],
      ),
    (newPartialConfigs, oldPartialConfigs) => {
      // `push`, `remove` like methods will take care of keys when files are added or removed
      if (newPartialConfigs.length !== oldPartialConfigs.length) return;

      // Helper function to check if two partial configs are equal
      type PartialConfig = [string, string];
      const isEqual = (config1: PartialConfig, config2: PartialConfig) =>
        config1[0] === config2[0] && config1[1] === config2[1];

      // Update keys if the partial configs are different
      for (let i = 0; i < newPartialConfigs.length; i++) {
        if (!isEqual(newPartialConfigs[i], oldPartialConfigs[i])) {
          keys.value[i] = genKey(
            files.value[i],
            newPartialConfigs[i][1],
            newPartialConfigs[i][0],
          );
        }
      }
    },
  );

  /**
   * Represents the computed size of processed files.
   *
   * @remarks
   * This value is calculated based on the size of each processed file.
   *
   * @returns An array of human-readable file sizes for each processed file.
   */
  const processedSize = computed(() =>
    processedFiles.value.map((processedFile) =>
      processedFile?.size ? humanFileSize(processedFile.size) : undefined,
    ),
  );

  /**
   * Computed property that checks if the keys in the `keys` array are different.
   * @returns {boolean} Returns `true` if all keys are different, otherwise `false`.
   */
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

  /**
   * Pushes new files to the existing files array.
   * @param newFiles - An array of new files to be added.
   */
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

  /**
   * Processes a file by compressing and converting it, if not converted yet.
   *
   * @param index - The index of the file to process.
   * @param force - Optional parameter to force reprocessing of the file.
   */
  const processFile = async (index: number, force?: boolean) => {
    if (processedFiles.value[index] === null || force) {
      processedFiles.value[index] = await compressAndConvert(
        files.value[index],
        configs.value[index],
      );
    }
  };

  /**
   * Uploads all files to the server.
   *
   * @param {FinishEachCb} finishedEachCb - Callback function called after each file upload is finished.
   * @returns {Promise<void>} - A Promise that resolves when all files are uploaded.
   */
  const upload = async (finishedEachCb: FinishEachCb): Promise<void> => {
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

  /**
   * Removes an item from the arrays at the specified index.
   *
   * @param index - The index of the item to remove.
   */
  const remove = (index: number) => {
    if (index !== -1) {
      files.value.splice(index, 1);
      keys.value.splice(index, 1);
      processedFiles.value.splice(index, 1);
      configs.value.splice(index, 1);
    }
  };

  const length = computed(() => files.value.length);

  /**
   * Resets the state of the upload store.
   */
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
    processedSize,
    processFile,
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

/**
 * Convert a number with a unit Byte to human readable string using KB, MB
 */
function humanFileSize(size: number) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    (size / Math.pow(1024, i)).toFixed(2) +
    " " +
    ["B", "KB", "MB", "GB", "TB"][i]
  );
}
