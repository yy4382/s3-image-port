import { S3Settings } from "./s3";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/../test/utils/render-with-providers";
import { fireEvent, screen } from "@testing-library/react";
import { useAtomValue } from "jotai";
import { s3SettingsAtom } from "@/stores/atoms/settings";
import { ReactNode } from "react";

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

const TEST_ID = "s3-settings-test";

function S3SettingsString() {
  const value = useAtomValue(s3SettingsAtom);
  return <pre data-testid={TEST_ID}>{JSON.stringify(value, null, 2)}</pre>;
}

function getConfigInAtom() {
  return JSON.parse(screen.getByTestId(TEST_ID).textContent ?? "{}");
}

describe("S3Settings", () => {
  it("should render", () => {
    render(<S3Settings />);
  });

  describe("endpoint", () => {
    it("defaults to empty string", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      expect(screen.getByLabelText("Endpoint").getAttribute("value")).toEqual(
        "",
      );
      expect(getConfigInAtom().endpoint).toEqual("");
    });
    it("can be set", async () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Endpoint");
      fireEvent.change(input, { target: { value: "https://example.com" } });
      fireEvent.blur(input);
      expect(input.getAttribute("value")).toEqual("https://example.com");
      expect(getConfigInAtom().endpoint).toEqual("https://example.com");
    });
    it("warn if not valid", async () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Endpoint");
      fireEvent.change(input, {
        target: { value: "not a valid url" },
      });
      fireEvent.blur(input);
      expect(
        await screen.findByText("Invalid URL", { exact: false }),
      ).not.toBeNull();

      expect(getConfigInAtom().endpoint).toEqual("not a valid url");
    });
  });

  describe("bucket", () => {
    it("defaults to empty string", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      expect(
        screen.getByLabelText("Bucket Name").getAttribute("value"),
      ).toEqual("");
      expect(getConfigInAtom().bucket).toEqual("");
    });
    it("can be set", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Bucket Name");
      fireEvent.change(input, { target: { value: "my-test-bucket" } });
      expect(input.getAttribute("value")).toEqual("my-test-bucket");
      expect(getConfigInAtom().bucket).toEqual("my-test-bucket");
    });
    it("warn if empty", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Bucket Name");
      fireEvent.change(input, { target: { value: "test" } });
      fireEvent.change(input, { target: { value: "" } });
      expect(
        screen.queryByText("Cannot be empty", { exact: false }),
      ).not.toBeNull();
      expect(getConfigInAtom().bucket).toEqual("");
    });
  });

  describe("region", () => {
    it("defaults to empty string", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      expect(screen.getByLabelText("Region").getAttribute("value")).toEqual("");
      expect(getConfigInAtom().region).toEqual("");
    });
    it("can be set", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Region");
      fireEvent.change(input, { target: { value: "us-east-1" } });
      expect(input.getAttribute("value")).toEqual("us-east-1");
      expect(getConfigInAtom().region).toEqual("us-east-1");
    });
    it("warn if empty", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Region");
      fireEvent.change(input, { target: { value: "test" } });
      fireEvent.change(input, { target: { value: "" } });
      expect(
        screen.queryByText("Cannot be empty", { exact: false }),
      ).not.toBeNull();
      expect(getConfigInAtom().region).toEqual("");
    });
  });

  describe("access key", () => {
    it("defaults to empty string", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      expect(screen.getByLabelText("Access Key").getAttribute("value")).toEqual(
        "",
      );
      expect(getConfigInAtom().accKeyId).toEqual("");
    });
    it("can be set", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Access Key");
      fireEvent.change(input, { target: { value: "acckey_example" } });
      expect(input.getAttribute("value")).toEqual("acckey_example");
      expect(getConfigInAtom().accKeyId).toEqual("acckey_example");
    });
    it("warn if empty", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Access Key");
      fireEvent.change(input, { target: { value: "test" } });
      fireEvent.change(input, { target: { value: "" } });
      expect(
        screen.queryByText("Cannot be empty", { exact: false }),
      ).not.toBeNull();
      expect(getConfigInAtom().accKeyId).toEqual("");
    });
  });

  describe("secret key", () => {
    it("defaults to empty string", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      expect(screen.getByLabelText("Secret Key").getAttribute("value")).toEqual(
        "",
      );
      expect(getConfigInAtom().secretAccKey).toEqual("");
    });
    it("can be set", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Secret Key");
      fireEvent.change(input, { target: { value: "seckey_example" } });
      expect(input.getAttribute("value")).toEqual("seckey_example");
      expect(getConfigInAtom().secretAccKey).toEqual("seckey_example");
    });
    it("warn if empty", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Secret Key");
      fireEvent.change(input, { target: { value: "test" } });
      fireEvent.change(input, { target: { value: "" } });
      expect(
        screen.queryByText("Cannot be empty", { exact: false }),
      ).not.toBeNull();
      expect(getConfigInAtom().secretAccKey).toEqual("");
    });
  });

  describe("force path style", () => {
    it("defaults to false", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const switchElement = screen.getByRole("switch", {
        name: "Use Path Style API",
      });
      expect(switchElement.getAttribute("data-state")).toEqual("unchecked");
      expect(getConfigInAtom().forcePathStyle).toEqual(false);
    });
    it("can be toggled", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const switchElement = screen.getByRole("switch", {
        name: "Use Path Style API",
      });
      fireEvent.click(switchElement);
      expect(switchElement.getAttribute("data-state")).toEqual("checked");
      expect(getConfigInAtom().forcePathStyle).toEqual(true);

      fireEvent.click(switchElement);
      expect(switchElement.getAttribute("data-state")).toEqual("unchecked");
      expect(getConfigInAtom().forcePathStyle).toEqual(false);
    });
  });

  describe("public url", () => {
    it("defaults to empty string", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      expect(screen.getByLabelText("Public URL").getAttribute("value")).toEqual(
        "",
      );
      expect(getConfigInAtom().pubUrl).toEqual("");
    });
    it("can be set", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      const input = screen.getByLabelText("Public URL");
      fireEvent.change(input, { target: { value: "https://cdn.example.com" } });
      expect(input.getAttribute("value")).toEqual("https://cdn.example.com");
      expect(getConfigInAtom().pubUrl).toEqual("https://cdn.example.com");
    });
    it("warn if not valid", () => {
      render(
        <>
          <S3Settings />
          <S3SettingsString />
        </>,
      );
      fireEvent.change(screen.getByLabelText("Public URL"), {
        target: { value: "not a valid url" },
      });
      expect(
        screen.queryByText("Invalid URL", { exact: false }),
      ).not.toBeNull();
      expect(getConfigInAtom().pubUrl).toEqual("not a valid url");
    });
  });
});
