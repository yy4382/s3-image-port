import { describe, expect, it, vi } from "vitest";
import { render } from "@/../test/utils/render-with-providers";
import { Profiles } from "./profiles";
import { fireEvent, renderHook, screen, within } from "@testing-library/react";
import { getDefaultOptions, Options, optionsAtom } from "../settings-store";
import { useAtom, useAtomValue } from "jotai";
import userEvent from "@testing-library/user-event";
import { CURRENT_PROFILE, profileListAtom } from "./profiles-utils";
import { produce } from "immer";

function prepareProfiles() {
  const { result } = renderHook(() => useAtom(profileListAtom));
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
  it("should initialize with empty local storage", () => {
    render(<Profiles />);
    const { result } = renderHook(() => useAtomValue(optionsAtom));
    expect(result.current).toEqual(getDefaultOptions());
    const item = screen.queryByTestId("profile-item-Default");
    expect(item).not.toBeNull();
    expect(item?.getAttribute("data-is-current")).toBe("true");
  });
});

describe("Profiles operations", { retry: 5 }, () => {
  describe("rename", () => {
    it("should rename active profile", async () => {
      const user = userEvent.setup();
      render(<Profiles />);
      const button = screen.getByRole("button", { name: "Rename" });

      await user.click(button);
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "New Name" } });
      fireEvent.click(screen.getByRole("button", { name: "Update" }));
      expect(screen.getByTestId("profile-item-New-Name")).not.toBeNull();
      expect(screen.getByText("New Name")).not.toBeNull();
      expect(screen.queryByTestId("profile-item-Default")).toBeNull();
    });
    it("should rename inactive profile", async () => {
      const user = userEvent.setup();
      render(<Profiles />);
      const duplicateButton = screen.getByRole("button", { name: "Duplicate" });

      await user.click(duplicateButton);
      const defaultContainer = screen.getByTestId(
        "profile-item-Default-(copy)",
      );
      const renameButton = within(defaultContainer).getByRole("button", {
        name: "Rename",
      });
      await user.click(renameButton);
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "new name" } });
      fireEvent.click(screen.getByRole("button", { name: "Update" }));
      expect(screen.getByTestId("profile-item-new-name")).not.toBeNull();
      expect(screen.getByText("new name")).not.toBeNull();
      expect(screen.queryByTestId("profile-item-Default-(copy)")).toBeNull();
    });
    it("should not rename when name is empty", async () => {
      const user = userEvent.setup();
      render(<Profiles />);
      const button = screen.getByRole("button", { name: "Rename" });
      await user.click(button);
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(screen.getByRole("button", { name: "Update" }));
      expect(screen.getByRole("button", { name: "Update" })).not.toBeNull();
    });
    it("should not rename when name is not changed", async () => {
      const user = userEvent.setup();
      render(<Profiles />);
      const button = screen.getByRole("button", { name: "Rename" });
      await user.click(button);
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Default" } });
      fireEvent.click(screen.getByRole("button", { name: "Update" }));
      expect(
        screen.findByText("New name is the same as the old name", {
          exact: false,
        }),
      ).not.toBeNull();
    });
    it("should not rename to another existing name", async () => {
      prepareProfiles();
      const user = userEvent.setup();
      render(<Profiles />);
      const defaultContainer = screen.getByTestId("profile-item-Default");
      const renameButton = within(defaultContainer).getByRole("button", {
        name: "Rename",
      });
      await user.click(renameButton);
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Default (copy)" } });
      fireEvent.click(screen.getByRole("button", { name: "Update" }));
      const error = await screen.findByText("Profile name already exists");
      expect(error).not.toBeNull();
    });
  });
  describe("duplicate", () => {
    it("should duplicate active profile", async () => {
      const user = userEvent.setup();
      render(<Profiles />);
      const button = screen.getByRole("button", { name: "Duplicate" });
      await user.click(button);
      expect(screen.getByTestId("profile-item-Default-(copy)")).not.toBeNull();
    });
    it("should duplicate inactive profile", async () => {
      prepareProfiles();
      const user = userEvent.setup();
      render(<Profiles />);
      const defaultCopyContainer = screen.getByTestId(
        "profile-item-Default-(copy)",
      );
      const duplicateButton1 = within(defaultCopyContainer).getByRole(
        "button",
        {
          name: "Duplicate",
        },
      );
      await user.click(duplicateButton1);
      expect(
        screen.getByTestId("profile-item-Default-(copy)-(copy)"),
      ).not.toBeNull();
      const { result } = renderHook(() => useAtomValue(profileListAtom));
      expect((result.current[2][1] as Options).s3.endpoint).toBe(
        "https://copy.com",
      );
    });
    it("should handle name conflict", async () => {
      const user = userEvent.setup();
      render(<Profiles />);
      const duplicateButton = screen.getByRole("button", { name: "Duplicate" });

      await user.click(duplicateButton);
      await user.click(duplicateButton);

      expect(screen.getByTestId("profile-item-Default-(copy)")).not.toBeNull();
      expect(
        screen.getByTestId("profile-item-Default-(copy-2)"),
      ).not.toBeNull();
    });
  });
  describe("delete", () => {
    it("should delete profile", async () => {
      prepareProfiles();
      const user = userEvent.setup();
      render(<Profiles />);
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      await user.click(deleteButton);
      const deleteConfirmation = screen.getByRole("dialog");
      const deleteConfirmationButton = within(deleteConfirmation).getByRole(
        "button",
        { name: "Delete" },
      );
      await user.click(deleteConfirmationButton);
      expect(screen.queryByTestId("profile-item-Default-(copy)")).toBeNull();
    });
  });
  describe("load", () => {
    it("should load profile", async () => {
      prepareProfiles();
      const user = userEvent.setup();
      render(<Profiles />);
      const loadButton = screen.getByRole("button", { name: "Load" });
      await user.click(loadButton);
      expect(
        screen
          .getByTestId("profile-item-Default-(copy)")
          .getAttribute("data-is-current"),
      ).toBe("true");
      const { result } = renderHook(() => useAtomValue(optionsAtom));
      expect(result.current.s3.endpoint).toBe("https://copy.com");
    });
  });
});

describe("Profile import export", { retry: 5 }, () => {
  it("should export profile", async () => {
    const user = userEvent.setup();
    render(<Profiles />);
    const exportButton = screen.getByRole("button", { name: "Export" });
    await user.click(exportButton);
    expect(await navigator.clipboard.readText()).toEqual(
      JSON.stringify({ name: "Default", data: getDefaultOptions() }, null, 2),
    );
  });
  it("should import profile", async () => {
    const user = userEvent.setup();
    render(<Profiles />);
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
    await user.click(importButton);
    const import2 = screen.getByRole("menuitem", {
      name: "Import from Clipboard",
    });
    await user.click(import2);
    expect(screen.getByTestId("profile-item-Default1")).not.toBeNull();
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
    const user = userEvent.setup();
    render(<Profiles />);
    await navigator.clipboard.writeText(JSON.stringify(validV1Config));
    const importButton = screen.getByRole("button", { name: "Import Profile" });
    await user.click(importButton);
    const import2 = screen.getByRole("menuitem", {
      name: "Import V1 Profile from Clipboard",
    });
    await user.click(import2);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      screen.getByTestId(`profile-item-Migrated-${date.toISOString()}`),
    ).not.toBeNull();
  });
});
