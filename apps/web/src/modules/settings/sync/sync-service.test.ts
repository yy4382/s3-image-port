import { describe, test, expect, vi, beforeEach } from "vitest";
import { sync } from "./sync-service";
import { sha256 } from "@/lib/utils/hash";
import { deriveAuthToken, encrypt } from "@/lib/encryption/crypto";
import { produce } from "immer";
import { settingsStoreToSyncStore } from "../settings-store";
import { getDefaultProfiles } from "../settings-store";
import { z } from "zod";
import { settingsInDbEncryptedSchema } from "./types";
import { profilesSchemaForLoad } from "../schema/v3";

const mocks = vi.hoisted(() => {
  import.meta.env.VITEST = true;
  const mockDb = new Map<string, string>();
  const redisGetFn = vi.fn().mockImplementation((key) => {
    return Promise.resolve(mockDb.get(key));
  });
  const redisSetFn = vi.fn().mockImplementation((key, value) => {
    mockDb.set(key, value);
    return Promise.resolve();
  });
  return { mockDb, redisGetFn, redisSetFn };
});
vi.mock(import("@/lib/redis/client"), () => {
  return {
    getRedisClient: vi.fn().mockReturnValue({
      get: mocks.redisGetFn,
      set: mocks.redisSetFn,
    }),
  };
});
vi.mock("@/lib/orpc/client", async () => {
  const { createRouterClient } = await import("@orpc/server");
  const { router } = await import("@/lib/orpc/router");
  return {
    client: createRouterClient(router),
  };
});

const TEST_TOKEN =
  "prosper law opinion either impact legend humble rural split surround excite giraffe";
const testAuthHash = await sha256(await deriveAuthToken(TEST_TOKEN));

async function runSync(...args: Parameters<typeof sync>) {
  const { local: localUpdate, config: configUpdate } = await sync(...args);
  const { local: localInitial, config: configInitial } = args[0];
  return {
    local: localUpdate
      ? typeof localUpdate === "function"
        ? localUpdate(localInitial)
        : localUpdate
      : localInitial,
    config: configUpdate
      ? typeof configUpdate === "function"
        ? configUpdate(configInitial)
        : configUpdate
      : configInitial,
  };
}

async function setupDb({
  ver,
  data,
}: {
  ver: number;
  data: z.infer<typeof profilesSchemaForLoad>;
}) {
  const key = `profile:sync:${testAuthHash}`;
  const unencrypted = settingsStoreToSyncStore(data);
  const encrypted = await encrypt(JSON.stringify(unencrypted), TEST_TOKEN);
  mocks.mockDb.set(
    key,
    JSON.stringify({
      version: ver,
      data: encrypted,
      updatedAt: Date.now(),
    } satisfies z.infer<typeof settingsInDbEncryptedSchema>),
  );
  return { unencrypted, encrypted };
}
function getDefaultSyncStore() {
  return settingsStoreToSyncStore(getDefaultProfiles());
}

beforeEach(() => {
  mocks.mockDb.clear();
  vi.clearAllMocks();
});

describe("syncServiceAtom", () => {
  test("", () => {
    expect(import.meta.env.VITEST).toBe(true);
  });
  test("local fresh, remote empty", async () => {
    const conflictResolver = vi.fn();
    const { local, config } = await runSync(
      {
        local: getDefaultSyncStore(),
        config: { enabled: true, version: 0, lastUpload: null },
        token: TEST_TOKEN,
      },
      {
        conflictResolver: vi.fn(),
      },
    );
    expect(mocks.redisGetFn).toHaveBeenCalledWith(
      expect.stringContaining(testAuthHash),
    );
    expect(mocks.redisSetFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('"version":1'),
    );
    expect(conflictResolver).not.toHaveBeenCalled();
    expect(local).toEqual(getDefaultSyncStore());
    expect(config).toEqual({
      enabled: true,
      version: 1,
      lastUpload: getDefaultSyncStore(),
    });
  });
  test("local fresh, remote not empty, local remote matching", async () => {
    await setupDb({
      ver: 5,
      data: getDefaultProfiles(),
    });
    const conflictResolver = vi.fn();
    const { local, config } = await runSync(
      {
        local: getDefaultSyncStore(),
        config: { enabled: true, version: 0, lastUpload: null },
        token: TEST_TOKEN,
      },
      { conflictResolver },
    );
    expect(mocks.redisSetFn).not.toHaveBeenCalled();
    expect(conflictResolver).not.toHaveBeenCalled();
    expect(config.version).toBe(5);
    expect(config.lastUpload).toEqual(getDefaultSyncStore());
    expect(local).toEqual(getDefaultSyncStore());
  });
  test("local fresh, remote not empty, local remote not matching, resolve to local", async () => {
    // remote being set to local, version++, local version updated
    await setupDb({
      ver: 5,
      data: produce(getDefaultProfiles(), (draft) => {
        draft.list[0][1].s3.bucket = "aaa";
      }),
    });
    const conflictResolver = vi.fn(() => Promise.resolve("local" as const));
    const { local, config } = await runSync(
      {
        local: getDefaultSyncStore(),
        config: { enabled: true, version: 0, lastUpload: null },
        token: TEST_TOKEN,
      },
      { conflictResolver },
    );
    expect(conflictResolver).toHaveBeenCalled();
    expect(local).toEqual(getDefaultSyncStore());
    expect(config).toEqual({
      enabled: true,
      version: 6,
      lastUpload: getDefaultSyncStore(),
    });
    expect(mocks.redisSetFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('"version":6'),
    );
  });
  test("local fresh, remote not empty, local remote not matching, resolve to remote", async () => {
    // local be set to remote data and version
    const { unencrypted } = await setupDb({
      ver: 5,
      data: produce(getDefaultProfiles(), (draft) => {
        draft.list[0][1].s3.bucket = "aaa";
      }),
    });
    const conflictResolver = vi.fn(() => Promise.resolve("remote" as const));
    const { local, config } = await runSync(
      {
        local: getDefaultSyncStore(),
        config: { enabled: true, version: 0, lastUpload: null },
        token: TEST_TOKEN,
      },
      { conflictResolver },
    );
    expect(conflictResolver).toHaveBeenCalled();
    expect(local).toEqual(unencrypted);
    expect(config).toEqual({
      enabled: true,
      version: 5,
      lastUpload: unencrypted,
    });
    expect(mocks.redisSetFn).not.toHaveBeenCalled();
  });
  test("local not dirty, remote - lastUpload matching (all the same)", async () => {
    // nothing changed
    await setupDb({
      ver: 5,
      data: getDefaultProfiles(),
    });
    const conflictResolver = vi.fn();
    const { local, config } = await runSync(
      {
        local: getDefaultSyncStore(),
        config: { enabled: true, version: 5, lastUpload: null },
        token: TEST_TOKEN,
      },
      { conflictResolver },
    );
    expect(conflictResolver).not.toHaveBeenCalled();
    expect(local).toEqual(getDefaultSyncStore());
    expect(config).toEqual({
      enabled: true,
      version: 5,
      lastUpload: getDefaultSyncStore(),
    });
    expect(mocks.redisSetFn).not.toHaveBeenCalled();
  });
  test("local not dirty, remote - lastUpload not matching", async () => {
    // local be set to remote data and version
    const { unencrypted } = await setupDb({
      ver: 5,
      data: produce(getDefaultProfiles(), (draft) => {
        draft.list[0][1].s3.bucket = "aaa";
      }),
    });
    const conflictResolver = vi.fn();
    const localState = produce(getDefaultSyncStore(), (draft) => {
      draft.data.list[0][1].s3.bucket = "bbb";
    });
    const { local, config } = await runSync(
      {
        local: localState,
        config: { enabled: true, version: 3, lastUpload: localState },
        token: TEST_TOKEN,
      },
      { conflictResolver },
    );
    expect(conflictResolver).not.toHaveBeenCalled();
    expect(local).toEqual(unencrypted);
    expect(config).toEqual({
      enabled: true,
      version: 5,
      lastUpload: unencrypted,
    });
    expect(mocks.redisSetFn).not.toHaveBeenCalled();
  });
  test("local dirty, remote - lastUpload matching", async () => {
    // upload local data to remote and version++
    const { unencrypted } = await setupDb({
      ver: 5,
      data: getDefaultProfiles(),
    });
    const localState = produce(getDefaultSyncStore(), (draft) => {
      draft.data.list[0][1].s3.bucket = "bbb";
    });
    const conflictResolver = vi.fn(() => {
      expect.unreachable("should not call conflict resolver");
    });
    const { local, config } = await runSync(
      {
        local: localState,
        config: { enabled: true, version: 5, lastUpload: unencrypted },
        token: TEST_TOKEN,
      },
      { conflictResolver },
    );
    expect(conflictResolver).not.toHaveBeenCalled();
    expect(local).toEqual(localState);
    expect(config).toEqual({
      enabled: true,
      version: 6,
      lastUpload: localState,
    });
    expect(mocks.redisSetFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('"version":6'),
    );
  });
  test("local dirty, remote - lastUpload data matching but version not matching", async () => {
    // upload local data to remote and version++
    const { unencrypted } = await setupDb({
      ver: 5,
      data: getDefaultProfiles(),
    });
    const localState = produce(getDefaultSyncStore(), (draft) => {
      draft.data.list[0][1].s3.bucket = "bbb";
    });
    const conflictResolver = vi.fn(() => {
      return Promise.resolve("local" as const);
    });
    const { local, config } = await runSync(
      {
        local: localState,
        config: { enabled: true, version: 4, lastUpload: unencrypted },
        token: TEST_TOKEN,
      },
      { conflictResolver },
    );
    expect(conflictResolver).toHaveBeenCalled();
    expect(local).toEqual(localState);
    expect(config).toEqual({
      enabled: true,
      version: 6,
      lastUpload: localState,
    });
    expect(mocks.redisSetFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('"version":6'),
    );
  });
  test("local dirty, remote - lastUpload not matching, resolve to local", async () => {
    // upload local data to remote and version++
    await setupDb({
      ver: 5,
      data: getDefaultProfiles(),
    });
    const localState = produce(getDefaultSyncStore(), (draft) => {
      draft.data.list[0][1].s3.bucket = "bbb";
    });
    const lastUploadState = produce(getDefaultSyncStore(), (draft) => {
      draft.data.list[0][1].s3.bucket = "ccc";
    });
    const conflictResolver = vi.fn(() => {
      return Promise.resolve("local" as const);
    });
    const { local, config } = await runSync(
      {
        local: localState,
        config: { enabled: true, version: 4, lastUpload: lastUploadState },
        token: TEST_TOKEN,
      },
      { conflictResolver },
    );
    expect(conflictResolver).toHaveBeenCalled();
    expect(local).toEqual(localState);
    expect(config).toEqual({
      enabled: true,
      version: 6,
      lastUpload: localState,
    });
    expect(mocks.redisSetFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('"version":6'),
    );
  });
  test("local dirty, remote - lastUpload not matching, resolve to remote", async () => {
    // set local to remote data
    const { unencrypted } = await setupDb({
      ver: 5,
      data: produce(getDefaultProfiles(), (draft) => {
        draft.list[0][1].s3.bucket = "aaa";
      }),
    });
    const localState = produce(getDefaultSyncStore(), (draft) => {
      draft.data.list[0][1].s3.bucket = "bbb";
    });
    const lastUploadState = produce(getDefaultSyncStore(), (draft) => {
      draft.data.list[0][1].s3.bucket = "ccc";
    });
    const conflictResolver = vi.fn(() => {
      return Promise.resolve("remote" as const);
    });
    const { local, config } = await runSync(
      {
        local: localState,
        config: { enabled: true, version: 4, lastUpload: lastUploadState },
        token: TEST_TOKEN,
      },
      { conflictResolver },
    );
    expect(conflictResolver).toHaveBeenCalled();
    expect(local).toEqual(unencrypted);
    expect(config).toEqual({
      enabled: true,
      version: 5,
      lastUpload: unencrypted,
    });
    expect(mocks.redisSetFn).not.toHaveBeenCalled();
  });
});
