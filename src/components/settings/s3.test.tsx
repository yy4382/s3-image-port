/**
 * TODO this test is severely outdated, it should be rewritten
 */

import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { S3Settings } from "./s3";
import {
  s3SettingsAtom,
  validS3SettingsAtom,
  // originalLocalStorage,
} from "./settingsStore";
import { createStore, Provider, useAtomValue } from "jotai";
import type { PropsWithChildren } from "react";

const wrapper =
  (store: ReturnType<typeof createStore>) =>
  ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );

describe("S3Settings input", () => {
  test("should initially render with empty values without error", async () => {
    render(<S3Settings />, { wrapper: wrapper(createStore()) });

    await screen.findByText("S3");

    expect(screen.getByText("Endpoint").dataset.error).toBe("false");
  });
  test("should render errors after user inputting", async () => {
    render(<S3Settings />, { wrapper: wrapper(createStore()) });

    await screen.findByText("S3");
    await userEvent.type(screen.getByLabelText("Endpoint"), "invalid-endpoint");
    expect(screen.getByText("Endpoint").dataset.error).toBe("true");
  });
});
const setupLocalStorage = () => {
  window.localStorage.setItem("s3ip:s3:endpoint", '"https://example.com"');
  window.localStorage.setItem("s3ip:s3:bucketName", '"example-bucket"');
  window.localStorage.setItem("s3ip:s3:region", '"us-east-1"');
  window.localStorage.setItem("s3ip:s3:accessKey", '"example-access-key"');
  window.localStorage.setItem("s3ip:s3:secretKey", '"example-secret-key"');
  window.localStorage.setItem("s3ip:s3:usePathStyle", "true");
  window.localStorage.setItem(
    "s3ip:s3:publicUrl",
    '"https://example.com/public"',
  );
};
describe("S3Settings atom", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  test("should change exported S3SettingsAtom (invalid)", async () => {
    const store = createStore();
    render(<S3Settings />, { wrapper: wrapper(store) });
    const { result: s3SettingsAtomValue } = renderHook(
      () => useAtomValue(s3SettingsAtom),
      { wrapper: wrapper(store) },
    );
    const { result: validS3SettingsAtomValue } = renderHook(
      () => useAtomValue(validS3SettingsAtom),
      { wrapper: wrapper(store) },
    );

    await screen.findByText("S3");
    expect(s3SettingsAtomValue.current.endpoint).toBe("");
    await userEvent.type(
      screen.getByLabelText("Endpoint"),
      "https://example2.com",
      { initialSelectionStart: 0, initialSelectionEnd: 100 },
    );

    expect(s3SettingsAtomValue.current.endpoint).toBe("https://example2.com");
    expect(validS3SettingsAtomValue.current).toBeUndefined();
  });
  test("should change exported S3SettingsAtom (valid)", async () => {
    const store = createStore();
    setupLocalStorage();
    render(<S3Settings />, { wrapper: wrapper(store) });
    const { result: s3SettingsAtomValue } = renderHook(
      () => useAtomValue(s3SettingsAtom),
      { wrapper: wrapper(store) },
    );
    const { result: validS3SettingsAtomValue } = renderHook(
      () => useAtomValue(validS3SettingsAtom),
      { wrapper: wrapper(store) },
    );

    await screen.findByText("S3");
    await userEvent.type(
      screen.getByLabelText("Endpoint"),
      "https://example1.com",
      { initialSelectionStart: 0, initialSelectionEnd: 100 },
    );

    expect(s3SettingsAtomValue.current.endpoint).toBe("https://example1.com");
    expect(validS3SettingsAtomValue.current).not.toBeUndefined();
  });
});

vi.mock(import("../../utils/ImageS3Client"));

describe("s3settings validation", () => {
  test("should validate s3 settings (invalid config)", async () => {
    const store = createStore();
    render(<S3Settings />, { wrapper: wrapper(store) });

    await screen.findByText("S3");
    await userEvent.click(screen.getByText("Validate S3 Settings"));

    expect(screen.findByText("S3 settings are not valid"));
  });
  test("should validate s3 settings (empty)", async () => {
    setupLocalStorage();
    window.localStorage.setItem("s3ip:s3:bucketName", '"empty"');
    const store = createStore();
    render(<S3Settings />, { wrapper: wrapper(store) });

    await screen.findByText("S3");
    await userEvent.click(screen.getByText("Validate S3 Settings"));

    expect(
      await screen.findByText(/.*S3 settings are not valid.*/),
    ).toBeTruthy();
  });
  test("should validate s3 settings (partial)", async () => {
    setupLocalStorage();
    window.localStorage.setItem("s3ip:s3:bucketName", '"partial"');
    const store = createStore();
    render(<S3Settings />, { wrapper: wrapper(store) });

    await screen.findByText("S3");
    await userEvent.click(screen.getByText("Validate S3 Settings"));

    expect(
      await screen.findByText(/.*Some CORS methods not allowed.*/),
    ).toBeTruthy();
  });
  test("should validate s3 settings (full)", async () => {
    setupLocalStorage();
    window.localStorage.setItem("s3ip:s3:bucketName", '"any"');
    const store = createStore();
    render(<S3Settings />, { wrapper: wrapper(store) });

    await screen.findByText("S3");
    await userEvent.click(screen.getByText("Validate S3 Settings"));

    expect(await screen.findByText(/.*S3 settings are valid*/)).toBeTruthy();
  });
});
