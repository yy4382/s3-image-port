# S3 Image Port

> [!TIP]
> Under early and rapid development...

If using S3 for image hosting, this is a frontend to manage your images in a S3 (or S3 compatible) bucket.

This website directly communicate with the bucket using S3 APIs, so a server (or a container) is not needed.

Considering to add some server side functions such as detecting duplicated images in the bucket. However, I will keep these functions simple so that they can be executed on edge(such as Vercel).

## Features

- Upload multiple images.
- Convert to jpg or webp before upload.
- Categorize images.
- List and preview images in bucket.
- Delete images.

## Requirements

The directories of the s3 bucket should be `/${category}/${year}/${month}/${day}/filename`. Errors may occur if the directory structure violate this pattern, since i haven't write any code for error handle.
