import { describe, test, expect, vi } from "vitest";
import { render } from "@/../test/utils/render-browser";
import { KeyTemplateSettingsInput } from "./setting-input";
import { ReactNode } from "react";
import { defaultKeyTemplate } from "@/lib/s3/s3-key";
import { renderHook } from "vitest-browser-react";
import { useAtom } from "jotai";
import { uploadSettingsAtom } from "../../settings-store";

vi.mock(import("@tanstack/react-router"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    Link: (props) => {
      return (
        <a href={props.href ?? props.to?.toString() ?? ""}>
          {props.children as ReactNode}
        </a>
      );
    },
  };
});

test("should render", async () => {
  const screen = await render(<KeyTemplateSettingsInput />);
  await expect
    .element(screen.getByText("Default Key template"), { timeout: 5000 })
    .toBeVisible();
});

async function getUploadSettings() {
  return await renderHook(() => useAtom(uploadSettingsAtom));
}

describe("Default Key template input", () => {
  test("change takes effect", async () => {
    const screen = await render(<KeyTemplateSettingsInput />);
    const { result } = await getUploadSettings();
    await screen
      .getByLabelText("Default Key template")
      .fill("i/{{ulid}}.{{ext}}");
    expect(result.current[0].keyTemplate).toBe("i/{{ulid}}.{{ext}}");
  });
});

describe("key template input with reset", () => {
  test("show reset button when value is not default", async () => {
    const screen = await render(<KeyTemplateSettingsInput />);
    await screen
      .getByLabelText("Default Key template")
      .fill("i/{{ulid}}.{{ext}}");
    await expect
      .element(screen.getByRole("button", { name: "Reset to default" }))
      .toBeVisible();
  });
  test("should not show reset button when value is default", async () => {
    const screen = await render(<KeyTemplateSettingsInput />);
    await screen
      .getByLabelText("Default Key template")
      .fill(defaultKeyTemplate);
    await expect
      .element(screen.getByRole("button", { name: "Reset to default" }), {
        timeout: 5000,
      })
      .not.toBeInTheDocument();
  });
  test("should reset to default when reset button is clicked", async () => {
    const screen = await render(<KeyTemplateSettingsInput />);
    await screen
      .getByLabelText("Default Key template")
      .fill("i/{{ulid}}.{{ext}}");
    await screen.getByRole("button", { name: "Reset to default" }).click();
    await expect
      .element(screen.getByLabelText("Default Key template"))
      .toHaveValue(defaultKeyTemplate);
  });
  test("should error occurs when value is invalid", async () => {
    const screen = await render(<KeyTemplateSettingsInput />);
    const input = screen.getByLabelText("Default Key template");
    await input.clear();
    input.element().blur();
    await expect.element(input).toBeInvalid();
    await expect.element(screen.getByRole("alert")).toBeInTheDocument();
  });
  test("should warning occurs when value is invalid", async () => {
    const screen = await render(<KeyTemplateSettingsInput />);
    await screen
      .getByLabelText("Default Key template")
      .fill("i/{{ulid}}.{{ext");
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(".{{ext}}");
  });
});

describe("presets", () => {
  test("has system preset and can apply as default", async () => {
    const { result, act } = await getUploadSettings();
    await act(() => {
      result.current[1]((prev) => ({ ...prev, keyTemplate: "random-string" }));
    });

    const screen = await render(<KeyTemplateSettingsInput />);
    await expect
      .element(screen.getByTestId("system-preset-badge"))
      .toBeInTheDocument();
    screen.getByRole("button", { name: "System preset actions" });
    await screen.getByRole("button", { name: "System preset actions" }).click();
    await screen.getByRole("menuitem", { name: "Apply as Default" }).click();
    await expect
      .element(screen.getByLabelText("Default Key template"))
      .toHaveValue(defaultKeyTemplate);

    expect(result.current[0].keyTemplate).toBe(defaultKeyTemplate);
  });
  test("can add new preset", async () => {
    const screen = await render(<KeyTemplateSettingsInput />);
    await screen.getByRole("button", { name: "add new preset" }).click();
    await expect
      .element(screen.getByTestId(/preset-user-defined-item-.*$/))
      .toBeInTheDocument();
  });
  test("can edit preset", async () => {
    const { result, act } = await getUploadSettings();
    await act(() => {
      result.current[1]((prev) => ({
        ...prev,
        keyTemplatePresets: [
          { key: "1", value: "i1/{{ulid}}.{{ext}" },
          { key: "2", value: "i2/{{ulid}}.{{ext}" },
        ],
      }));
    });
    const screen = await render(<KeyTemplateSettingsInput />);
    const row = screen.getByTestId("preset-user-defined-item-1");
    await row.getByRole("button").click();
    await screen.getByRole("menuitem", { name: "Edit" }).click();
    await row.getByRole("textbox").fill("i1/{{ulid}}-edit.{{ext}}");
    await screen.getByRole("button", { name: "Save" }).click();
    await expect
      .element(row.getByRole("cell").first().element())
      .toHaveTextContent("i1/{{ulid}}-edit.{{ext}}");
    expect(result.current[0].keyTemplatePresets).toEqual([
      { key: "1", value: "i1/{{ulid}}-edit.{{ext}}" },
      { key: "2", value: "i2/{{ulid}}.{{ext}" },
    ]);
  });
  test("can apply user defined preset as default", async () => {
    const { result, act } = await getUploadSettings();
    await act(() => {
      result.current[1]((prev) => ({
        ...prev,
        keyTemplatePresets: [
          { key: "1", value: "i1/{{ulid}}.{{ext}" },
          { key: "2", value: "i2/{{ulid}}.{{ext}" },
        ],
      }));
    });
    const screen = await render(<KeyTemplateSettingsInput />);
    const row = screen.getByTestId("preset-user-defined-item-1");
    await row.getByRole("button").click();
    await screen.getByRole("menuitem", { name: "Apply as Default" }).click();
    await expect
      .element(screen.getByLabelText("Default Key template"))
      .toHaveValue("i1/{{ulid}}.{{ext}");
  });
  test("can delete user defined preset", async () => {
    const { result, act } = await getUploadSettings();
    await act(() => {
      result.current[1]((prev) => ({
        ...prev,
        keyTemplatePresets: [
          { key: "1", value: "i1/{{ulid}}.{{ext}" },
          { key: "2", value: "i2/{{ulid}}.{{ext}" },
        ],
      }));
    });
    const screen = await render(<KeyTemplateSettingsInput />);
    const row = screen.getByTestId("preset-user-defined-item-1");
    await row.getByRole("button").click();
    await screen.getByRole("menuitem", { name: "Delete" }).click();
    await expect.element(row).not.toBeInTheDocument();
  });
});
