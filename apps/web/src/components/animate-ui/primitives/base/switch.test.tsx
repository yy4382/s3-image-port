import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./switch";

const buttonContractError =
  "Base UI: A component that acts as a button was rendered as a native <button>";

describe("animated Switch", () => {
  it("mounts as a native button without a Base UI contract warning", () => {
    const errors: unknown[][] = [];
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        errors.push(args);
      });

    try {
      render(<Switch aria-label="Example" />);

      expect(
        errors.filter(([message]) =>
          String(message).startsWith(buttonContractError),
        ),
      ).toEqual([]);
    } finally {
      consoleError.mockRestore();
    }
  });
});
