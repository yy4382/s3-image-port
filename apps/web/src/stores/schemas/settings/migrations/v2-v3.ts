import { z } from "zod";
import * as v3Schema from "../v3";

function isBrowser() {
  return typeof window !== "undefined" && window.localStorage;
}

export function migrateV2ToV3(): z.infer<
  typeof v3Schema.profilesSchemaForLoad
> {
  if (!isBrowser()) {
    return v3Schema.getDefaultProfiles();
  }
  let options: z.infer<typeof v3Schema.optionsSchemaForLoad>;
  try {
    const storedOptions = window.localStorage.getItem("s3ip:options");
    if (!storedOptions) {
      return v3Schema.getDefaultProfiles();
    }
    const { data } = z
      .object({
        data: v3Schema.optionsSchemaForLoad,
        version: z.number(),
      })
      .parse(JSON.parse(storedOptions));
    options = data;
  } catch (error) {
    console.error("Failed to get default profiles with migrate from v2", error);
    return v3Schema.getDefaultProfiles();
  }
  try {
    const storedProfiles = window.localStorage.getItem("s3ip:profile:profiles");
    if (!storedProfiles) {
      return {
        list: [["Default", options]],
        current: 0,
      };
    }
    const oldProfiles = z
      .array(
        z.tuple([
          z.string(),
          v3Schema.optionsSchemaForLoad.or(z.literal("CURRENT")),
        ]),
      )
      .parse(JSON.parse(storedProfiles));

    const currentIndex = oldProfiles.findIndex(
      ([_, profile]) => profile === "CURRENT",
    );
    if (currentIndex === -1) {
      throw new Error("No current profile");
    }
    const newProfiles = oldProfiles.map<
      [string, z.infer<typeof v3Schema.optionsSchemaForLoad>]
    >(([name, profile]) => {
      if (profile === "CURRENT") {
        return [name, options];
      }
      return [name, profile];
    });
    return {
      list: newProfiles,
      current: currentIndex,
    };
  } catch (error) {
    console.error(error);
    return {
      list: [["Default", options]],
      current: 0,
    };
  }
}

export function migrateV2ToV3OnUnmount() {
  if (!isBrowser()) {
    return;
  }
  if (localStorage.getItem("s3ip:profiles-list")) {
    localStorage.removeItem("s3ip:options");
    localStorage.removeItem("s3ip:profile:profiles");
  }
}
