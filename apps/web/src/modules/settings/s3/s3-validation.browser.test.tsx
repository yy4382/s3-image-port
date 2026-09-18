import { describe, expect, inject, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Provider, createStore } from "jotai";
import { IntlProvider } from "use-intl";
import en from "@/../messages/en.json";
import zh from "@/../messages/zh.json";
import { settings } from "@/stores/atoms/settings";
import { createS3ImageStorage } from "@/modules/image-storage";
import type { S3Options } from "@/stores/schemas/settings";
import { S3Validation } from "./s3-validation";

const origin = window.location.origin;
let nextId = 0;
function config(scenario: string): S3Options {
  return {
    endpoint: `${inject("s3FixtureUrl")}/${scenario}/${++nextId}`,
    bucket: "images",
    region: "us-west-2",
    accKeyId: "LOCAL-FAKE-ACCESS",
    secretAccKey: "LOCAL-FAKE-SECRET",
    includePath: "prefix",
    forcePathStyle: true,
    pubUrl: "https://cdn.example.com",
  };
}
async function records(options: S3Options) {
  const response = await fetch(`${inject("s3FixtureUrl")}/__requests`);
  const all = (await response.json()) as Array<{
    path: string;
    method: string;
    query: Record<string, string>;
    aborted: boolean;
    region: string;
  }>;
  return all.filter(
    (item) =>
      item.path.replace(/\/$/, "") ===
        new URL(options.endpoint).pathname + "/images" &&
      item.method !== "OPTIONS",
  );
}
async function renderValidation(
  options: S3Options,
  locale: "en" | "zh" = "en",
) {
  const store = createStore();
  store.set(settings.storage, { type: "update", value: options });
  const rendered = await page.render(
    <Provider store={store}>
      <IntlProvider locale={locale} messages={locale === "en" ? en : zh}>
        <S3Validation />
      </IntlProvider>
    </Provider>,
  );
  return { store, rendered };
}

describe("S3 diagnostics with real cross-origin browser requests", () => {
  it.each(["empty", "populated"])(
    "reads %s lists once, preserving prefix, target and signing region",
    async (scenario) => {
      const options = config(scenario);
      const { store } = await renderValidation(options);
      await page.getByRole("button", { name: "Test", exact: true }).click();
      await expect
        .element(page.getByText("List read succeeded", { exact: true }))
        .toBeVisible();
      const calls = await records(options);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        method: "GET",
        region: "us-west-2",
        query: { "list-type": "2", "max-keys": "1", prefix: "prefix" },
      });
      expect(calls[0].query).not.toHaveProperty("continuation-token");
      expect(store.get(settings.storage).cors.status).toBe("idle");
      await page.getByRole("button", { name: "View details" }).click();
      await expect
        .element(page.getByText(en.settings.s3Validation.scope))
        .toBeVisible();
      await page.getByRole("button", { name: "Check CORS" }).click();
      await expect
        .element(
          page.getByText("Unable to read CORS configuration", { exact: true }),
        )
        .toBeVisible();
      await expect
        .element(page.getByText(en.settings.s3Validation.reasons.corsDenied))
        .toBeVisible();
      expect(store.get(settings.storage).access.status).toBe("success");
      expect(await records(options)).toHaveLength(2);
      await expect
        .element(page.getByText("AccessDenied", { exact: true }))
        .toBeVisible();
    },
  );

  it.each([
    "AccessDenied",
    "InvalidAccessKeyId",
    "NoSuchBucket",
    "SignatureDoesNotMatch",
  ])("shows readable %s beside a visible details action", async (code) => {
    const options = config(`code/${code}`);
    const reasons = {
      AccessDenied: "accessDenied",
      InvalidAccessKeyId: "invalidKey",
      NoSuchBucket: "noBucket",
      SignatureDoesNotMatch: "signature",
    } as const;
    const { store } = await renderValidation(options);
    await page.getByRole("button", { name: "Test", exact: true }).click();
    await expect
      .element(
        page.getByText(
          en.settings.s3Validation.reasons[
            reasons[code as keyof typeof reasons]
          ],
        ),
      )
      .toBeVisible();
    // Keyboard users can reach and open the same textual action.
    const button = page.getByRole("button", { name: "View details" });
    await userEvent.tab();
    await button.click();
    await expect.element(page.getByText(code, { exact: true })).toBeVisible();
    await expect.element(page.getByText("403", { exact: true })).toBeVisible();
    expect(JSON.stringify(store.get(settings.storage).access)).not.toContain(
      "DO-NOT-SHOW",
    );
  });

  it.each(["hidden", "preflight-denied", "unreachable"])(
    "does not invent a readable status or root cause for %s",
    async (scenario) => {
      const options = config(scenario);
      const { store } = await renderValidation(options);
      await page.getByRole("button", { name: "Test", exact: true }).click();
      await expect
        .element(
          page.getByText("Unable to connect to the bucket.", { exact: true }),
        )
        .toBeVisible();
      const result = store.get(settings.storage).access;
      expect(result).toMatchObject({
        status: "failed",
        error: { reason: "network" },
      });
      if (result.status === "failed")
        expect(result.error).toEqual({ reason: "network" });
      await page.getByRole("button", { name: "View details" }).click();
      await expect
        .element(page.getByText(en.settings.s3Validation.browserHelp))
        .toBeVisible();
      await expect
        .element(page.getByRole("link", { name: "CORS setup help" }))
        .toBeVisible();
      await expect
        .element(page.getByText("HTTP status", { exact: true }))
        .not.toBeInTheDocument();
      if (scenario === "hidden") expect(await records(options)).toHaveLength(1);
      if (scenario === "preflight-denied")
        expect(await records(options)).toHaveLength(0);
    },
  );

  it("uses a readable status-only 403 without inventing a service code", async () => {
    await renderValidation(config("bare403"));
    await page.getByRole("button", { name: "Test", exact: true }).click();
    await expect
      .element(page.getByText(en.settings.s3Validation.reasons.accessDenied))
      .toBeVisible();
    await page.getByRole("button", { name: "View details" }).click();
    await expect.element(page.getByText("403", { exact: true })).toBeVisible();
    await expect
      .element(page.getByText("Service error code", { exact: true }))
      .not.toBeInTheDocument();
  });

  it.each([
    ["cors-code/NoSuchCORSConfiguration", "noCors"],
    ["cors-code/NotImplemented", "unsupported"],
    ["cors-hidden", "network"],
  ] as const)(
    "keeps list success and explains auxiliary %s by its evidence",
    async (scenario, reason) => {
      const { store } = await renderValidation(config(scenario));
      await page.getByRole("button", { name: "Test", exact: true }).click();
      await page.getByRole("button", { name: "View details" }).click();
      await page.getByRole("button", { name: "Check CORS" }).click();
      await expect
        .element(
          page.getByText(en.settings.s3Validation.reasons[reason], {
            exact: true,
          }),
        )
        .toBeVisible();
      expect(store.get(settings.storage).access.status).toBe("success");
      if (reason === "network")
        expect(store.get(settings.storage).cors).toMatchObject({
          error: { reason: "network" },
        });
    },
  );

  it.each(["html", "malformed"])(
    "rejects %s even with HTTP 200",
    async (scenario) => {
      const result = await createS3ImageStorage(config(scenario)).checkAccess({
        origin,
      });
      expect(result).toEqual({
        ok: false,
        error: { reason: "invalid-response", httpStatus: 200 },
      });
    },
  );

  it("does not retry a retryable service error", async () => {
    const options = config("retryable");
    expect(await createS3ImageStorage(options).checkAccess({ origin })).toEqual(
      {
        ok: false,
        error: { reason: "server", code: "SlowDown", httpStatus: 503 },
      },
    );
    expect(await records(options)).toHaveLength(1);
  });

  it.each(["slow", "slow-body"])(
    "aborts %s at the timeout and allows a new test",
    async (scenario) => {
      const options = config(scenario);
      const { store } = await renderValidation(options);
      await page.getByRole("button", { name: "Test", exact: true }).click();
      await expect
        .element(page.getByRole("button", { name: "Retry", exact: true }), {
          timeout: 13_000,
        })
        .toBeEnabled();
      expect(store.get(settings.storage).access).toMatchObject({
        status: "failed",
        error: { reason: "timeout" },
      });
      await expect
        .poll(async () => (await records(options))[0]?.aborted)
        .toBe(true);
      store.set(settings.storage, { type: "update", value: config("empty") });
      await page.getByRole("button", { name: "Test", exact: true }).click();
      await expect
        .element(page.getByText("List read succeeded", { exact: true }))
        .toBeVisible();
    },
    16_000,
  );

  it("reads wildcard CORS rules with explicit headers without claiming upload access", async () => {
    const options = config("cors-rules");
    const { store } = await renderValidation(options);
    await page.getByRole("button", { name: "Test", exact: true }).click();
    await page.getByRole("button", { name: "View details" }).click();
    await page.getByRole("button", { name: "Check CORS" }).click();
    await expect
      .element(page.getByText(en.settings.s3Validation.noMissingRules))
      .toBeVisible();
    await expect
      .element(page.getByText(en.settings.s3Validation.rulesScope))
      .toBeVisible();
    expect(store.get(settings.storage).cors).toMatchObject({
      status: "success",
      value: { originMatched: true, missingMethods: [] },
    });
  });

  it("copies only safe details and reports clipboard failure", async () => {
    const { store } = await renderValidation(config("denied"));
    await page.getByRole("button", { name: "Test", exact: true }).click();
    await page.getByRole("button", { name: "View details" }).click();
    const write = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValueOnce();
    try {
      await page.getByRole("button", { name: "Copy details" }).click();
      await expect
        .element(page.getByText("Details copied", { exact: true }))
        .toBeVisible();
      const copied = write.mock.calls[0][0];
      expect(JSON.parse(copied)).toMatchObject([
        {
          operation: "ListObjectsV2",
          code: "AccessDenied",
          httpStatus: 403,
          prefix: "prefix",
          origin,
        },
      ]);
      expect(copied).not.toMatch(
        /LOCAL-FAKE|DO-NOT-SHOW|Authorization|Signature/,
      );
      write.mockRejectedValueOnce(new Error("clipboard denied"));
      await page.getByRole("button", { name: "Copy details" }).click();
      await expect
        .element(page.getByText(en.settings.s3Validation.copyFailed))
        .toBeVisible();
      expect(store.get(settings.storage).access.status).toBe("failed");
    } finally {
      write.mockRestore();
    }
  });

  it.each(["en", "zh"] as const)(
    "keeps failure details usable at 320px in %s",
    async (locale) => {
      await page.viewport(320, 700);
      const options = config("denied");
      const messages = (locale === "en" ? en : zh).settings.s3Validation;
      await renderValidation(options, locale);
      await page
        .getByRole("button", { name: messages.testButton, exact: true })
        .click();
      await page
        .getByRole("button", { name: messages.details, exact: true })
        .click();
      const dialog = page.getByRole("dialog").element();
      expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
      expect(dialog.getBoundingClientRect().width).toBeLessThanOrEqual(320);
      await expect
        .element(
          page.getByRole("button", { name: messages.close, exact: true }),
        )
        .toBeVisible();
      await page.screenshot({ path: `/tmp/s3-129-${locale}-narrow.png` });
      dialog.scrollTop = 0;
      await page.screenshot({ path: `/tmp/s3-129-${locale}-details-top.png` });
      await page
        .getByRole("button", { name: messages.close, exact: true })
        .click();
      await page.viewport(1280, 720);
    },
  );
});
