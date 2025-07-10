# Migrate from v1

Version 2 mainly involves underlying architectural changes and some QoL improvements compared to v1, without many breaking changes at the user level. As a user, you only need to import your v1 configuration into v2 to continue using it.

## Configuration Migration

1. Go to the "Settings -> Profiles" page of [v1 version](https://iport.yfi.moe), click the "Copy" button for the configuration you want to migrate (you need to save a configuration first if you haven't saved one yet).
2. Go to the "Settings -> Profiles" page of [v2 version](https://imageport.app), click the import dropdown menu in the upper right corner of the card, and select "Import from v1".
3. If the v1 configuration meets the requirements (all required fields are non-empty), it should be able to import directly; if the import fails, please check:
   1. Whether the v1 configuration is correct
   2. Whether the content in the clipboard is the v1 configuration when importing
4. If the import is successful, please check whether the content of the v1 configuration is correctly displayed in the v2 version.

### Which configurations will be migrated?

Configurations that will be migrated include:

- All S3 bucket-related settings
- Path template (KeyTemplate)
- Whether to auto-refresh gallery

Configurations that will NOT be migrated include:

- Upload compression will be disabled by default; you can manually enable it if needed
- Other settings

Configurations that are not migrated will retain their default values after importing the v1 configuration.

## Breaking Changes

The gallery fuzzy search feature has been temporarily removed. If needed, you can [create an Issue](https://github.com/yy4382/s3-image-port/issues/new) to discuss it.

## Deprecated Settings

The `{{random}}` template in the path template (KeyTemplate) has been renamed to `{{ulid-dayslice}}` to better reflect its nature. `{{random}}` can still be used (behavior is the same as before), but will give a warning when input.

## About Self-hosting

Since `S3 Image Port` is actually a static website without a backend (it doesn't store images, and user traffic for accessing images doesn't go through Image Port), self-hosting is almost completely meaningless. Therefore, to reduce maintenance costs, v2 no longer provides officially maintained Docker images.

If you really want to self-host, please clone this project and execute the build command `pnpm run build` in the `apps/web` directory, then statically deploy the contents of the `out` directory.
