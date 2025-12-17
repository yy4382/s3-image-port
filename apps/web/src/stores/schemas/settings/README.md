# Settings Schemas

This directory contains the schemas for the settings.

## `v*` files

These files contain the schemas for the settings in version `v*`.

For now, each schema has a `schema` version and a `schemaForLoad` version.

The `schema` version is the strict schema, which is used for validation before actually use them. e.g. the URL needs to be valid URLs.

The `schemaForLoad` versions are a type and structure correct, but the values are not validated. This is useful when user is still typing in the settings form, or they haven't started configuring the settings yet. For example, the S3 endpoint can be empty string in this schema. This schema is used to load the settings from the local storage.

## `migrations` files

These files contain the migrations for the settings.

## `index.ts` file

This file exports the latest version of the schemas for the settings.
