# S3 Image Port

> [!TIP]
> Under early and rapid development...

If using S3 for image hosting, this is a frontend to manage your images in a S3 (or S3 compatible) bucket.

~~This website directly communicate with the bucket using S3 APIs, so a server (or a container) is not needed.~~

~~Considering to add some server side functions such as detecting duplicated images in the bucket. However, I will keep these functions simple so that they can be executed on edge(such as Vercel).~~

Currently tested on Vercel. Add environment variables to specify s3 config. See [.env.example](./.env.example). After setting the variables, you need to input the TOKEN variable in the setting page to start using it.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyy4382%2Fs3-image-port&env=NUXT_S3_CONFIG_ENDPOINT,NUXT_S3_CONFIG_ACC_KEY_ID,NUXT_S3_CONFIG_SECRET_ACC_KEY,NUXT_S3_CONFIG_REGION,NUXT_S3_CONFIG_BUCKET,NUXT_TOKEN)

## Features

- Upload multiple images.
- Convert to jpg or webp before upload.
- Categorize images.
- List and preview images in bucket.
- Delete images.

## Requirements

The directories of the s3 bucket should be `/${category}/${year}/${month}/${day}/filename`. Errors may occur if the directory structure violate this pattern, since i haven't write any code for error handle.
