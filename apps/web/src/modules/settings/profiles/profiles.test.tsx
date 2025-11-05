import { describe, expect, it, vi } from "vitest";
import { Profiles } from "./profiles";
import { getDefaultOptions, Options, optionsAtom } from "../settings-store";
import { useAtom, useAtomValue } from "jotai";
import { CURRENT_PROFILE, profileListAtom } from "./profiles-utils";
import { produce } from "immer";
import { renderHook } from "vitest-browser-react";
import { render } from "@/../test/utils/render-browser";

async function prepareProfiles() {
  const { result } = await renderHook(() => useAtom(profileListAtom));
  result.current[1]([
    ["Default", CURRENT_PROFILE],
    [
      "Default (copy)",
      produce(getDefaultOptions(), (draft) => {
        draft.s3.endpoint = "https://copy.com";
        return draft;
      }),
    ],
  ]);
}

describe("Profiles loading", () => {
  it("should initialize with empty local storage", async () => {
    const screen = await render(<Profiles />);
    const { result } = await renderHook(() => useAtomValue(optionsAtom));
    expect(result.current).toEqual(getDefaultOptions());
    const item = screen.getByTestId("profile-item-Default");
    await expect.element(item).toBeInTheDocument();
    await expect.element(item).toHaveAttribute("data-is-current", "true");
  });
});

describe("Profiles operations", { retry: 5 }, () => {
  describe("rename", () => {
    it("should rename active profile", async () => {
      const screen = await render(<Profiles />);
      const button = screen.getByRole("button", { name: "Rename" });

      await button.click();
      const input = screen.getByRole("textbox");
      await input.fill("New Name");
      await screen.getByRole("button", { name: "Update" }).click();
      await expect
        .element(screen.getByTestId("profile-item-New-Name"))
        .toBeInTheDocument();
      await expect.element(screen.getByText("New Name")).toBeInTheDocument();
      await expect
        .element(screen.getByTestId("profile-item-Default"))
        .not.toBeInTheDocument();
    });
    it("should rename inactive profile", async () => {
      const screen = await render(<Profiles />);
      const duplicateButton = screen.getByRole("button", { name: "Duplicate" });

      await duplicateButton.click();
      const defaultContainer = screen.getByTestId(
        "profile-item-Default-(copy)",
      );
      const renameButton = defaultContainer.getByRole("button", {
        name: "Rename",
      });
      await renameButton.click();
      const input = screen.getByRole("textbox");
      await input.fill("new name");
      await screen.getByRole("button", { name: "Update" }).click();
      await expect
        .element(screen.getByTestId("profile-item-new-name"))
        .toBeInTheDocument();
      await expect.element(screen.getByText("new name")).toBeInTheDocument();
      await expect
        .element(screen.getByTestId("profile-item-Default-(copy)"))
        .not.toBeInTheDocument();
    });
    it("should not rename when name is empty", async () => {
      const screen = await render(<Profiles />);
      const button = screen.getByRole("button", { name: "Rename" });
      await button.click();
      const input = screen.getByRole("textbox");
      await input.fill("");
      await screen.getByRole("button", { name: "Update" }).click();
      await expect
        .element(screen.getByRole("button", { name: "Update" }))
        .toBeInTheDocument();
    });
    it("should not rename when name is not changed", async () => {
      const screen = await render(<Profiles />);
      const button = screen.getByRole("button", { name: "Rename" });
      await button.click();
      const input = screen.getByRole("textbox");
      await input.fill("Default");
      await screen.getByRole("button", { name: "Update" }).click();
      await expect
        .element(
          screen.getByText("New name is the same as the old name", {
            exact: false,
          }),
        )
        .toBeInTheDocument();
    });
    it("should not rename to another existing name", async () => {
      await prepareProfiles();
      const screen = await render(<Profiles />);
      const defaultContainer = screen.getByTestId("profile-item-Default");
      const renameButton = defaultContainer.getByRole("button", {
        name: "Rename",
      });
      await renameButton.click();
      const input = screen.getByRole("textbox");
      await input.fill("Default (copy)");
      await screen.getByRole("button", { name: "Update" }).click();
      const error = screen.getByText("Profile name already exists");
      await expect.element(error).toBeInTheDocument();
    });
  });
  describe("duplicate", () => {
    it("should duplicate active profile", async () => {
      const screen = await render(<Profiles />);
      const button = screen.getByRole("button", { name: "Duplicate" });
      await button.click();
      await expect
        .element(screen.getByTestId("profile-item-Default-(copy)"))
        .toBeInTheDocument();
    });
    it("should duplicate inactive profile", async () => {
      await prepareProfiles();
      const screen = await render(<Profiles />);
      const defaultCopyContainer = screen.getByTestId(
        "profile-item-Default-(copy)",
      );
      const duplicateButton1 = defaultCopyContainer.getByRole("button", {
        name: "Duplicate",
      });
      await duplicateButton1.click();
      await expect
        .element(screen.getByTestId("profile-item-Default-(copy)-(copy)"))
        .toBeInTheDocument();
      const { result } = await renderHook(() => useAtomValue(profileListAtom));
      expect((result.current[2][1] as Options).s3.endpoint).toBe(
        "https://copy.com",
      );
    });
    it("should handle name conflict", async () => {
      const screen = await render(<Profiles />);
      const duplicateButton = screen.getByRole("button", { name: "Duplicate" });

      await duplicateButton.first().click();
      await duplicateButton.first().click();

      await expect
        .element(screen.getByTestId("profile-item-Default-(copy)"))
        .toBeInTheDocument();
      await expect
        .element(screen.getByTestId("profile-item-Default-(copy-2)"))
        .toBeInTheDocument();
    });
  });
  describe("delete", () => {
    it("should delete profile", async () => {
      await prepareProfiles();
      const screen = await render(<Profiles />);
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      await deleteButton.click();
      const deleteConfirmation = screen.getByRole("dialog");
      const deleteConfirmationButton = deleteConfirmation.getByRole("button", {
        name: "Delete",
      });
      await deleteConfirmationButton.click();
      await expect
        .element(screen.getByTestId("profile-item-Default-(copy)"))
        .not.toBeInTheDocument();
    });
  });
  describe("load", () => {
    it("should load profile", async () => {
      await prepareProfiles();
      const screen = await render(<Profiles />);
      const loadButton = screen.getByRole("button", { name: "Load" });
      await loadButton.click();
      await expect
        .element(screen.getByTestId("profile-item-Default-(copy)"))
        .toHaveAttribute("data-is-current", "true");
      const { result } = await renderHook(() => useAtomValue(optionsAtom));
      expect(result.current.s3.endpoint).toBe("https://copy.com");
    });
  });
});

describe("Profile import export", { retry: 5 }, () => {
  it("should export profile", async () => {
    const screen = await render(<Profiles />);
    const exportButton = screen.getByRole("button", { name: "Export" });
    await exportButton.click();
    expect(await navigator.clipboard.readText()).toEqual(
      JSON.stringify({ name: "Default", data: getDefaultOptions() }, null, 2),
    );
  });
  it("should import profile", async () => {
    const screen = await render(<Profiles />);
    await navigator.clipboard.writeText(
      JSON.stringify({
        name: "Default1",
        data: {
          s3: {
            endpoint: "https://example.com",
            bucket: "test",
            region: "us-east-1",
            accKeyId: "test",
            secretAccKey: "test",
            forcePathStyle: false,
            pubUrl: "https://example.com",
          },
          upload: {
            keyTemplate: "test",
            compressionOption: null,
          },
          gallery: {
            autoRefresh: true,
          },
        } satisfies Options,
      }),
    );
    const importButton = screen.getByRole("button", { name: "Import Profile" });
    await importButton.click();
    const import2 = screen.getByRole("menuitem", {
      name: "Import from Clipboard",
    });
    await import2.click();
    await expect
      .element(screen.getByTestId("profile-item-Default1"))
      .toBeInTheDocument();
  });
  it("should import v1 profile", async () => {
    const validV1Config = {
      s3: {
        endpoint: "https://example.com",
        bucket: "image-dev",
        region: "auto",
        accKeyId: "1234567890",
        secretAccKey: "1234567890",
        pubUrl: "https://pub.example.com",
        forcePathStyle: false,
      },
      app: {
        noLongerShowRootPage: true,
        convertType: "none",
        compressionMaxSize: "",
        compressionMaxWidthOrHeight: "",
        keyTemplate: "test/{{random}}/{{ext}}",
        enableAutoRefresh: false,
        enableFuzzySearch: true,
        fuzzySearchThreshold: 0.6,
      },
    };
    const date = new Date(2025, 1, 1);
    vi.setSystemTime(date);
    const screen = await render(<Profiles />);
    await navigator.clipboard.writeText(JSON.stringify(validV1Config));
    const importButton = screen.getByRole("button", { name: "Import Profile" });
    await importButton.click();
    const import2 = screen.getByRole("menuitem", {
      name: "Import V1 Profile from Clipboard",
    });
    await import2.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect
      .element(
        screen.getByTestId(`profile-item-Migrated-${date.toISOString()}`),
      )
      .toBeInTheDocument();
  });
});
