---
outline: [2, 4]
---

# Getting Started

## Configure S3 (or its compatible services)

As you can see, we are an application for managing images on S3. Although our application is out-of-the-box, you still need to configure your S3 storage bucket. Simply put, this requires 3 steps:

1. Create an S3-compatible storage bucket on the relevant platform.
2. Obtain information such as endpoints and keys needed to access the bucket.
3. Set access permissions and CORS for the bucket.

The above three points are essential steps to use the S3 Image Port.

:::warning :red_circle: CORS configuration required!
Since we are a web-based project, configuring CORS is necessary. Most of the "connection issues" reported by users are due to not configuring CORS.

For details on how to configure CORS, please continue reading.
:::

### Step-by-Step Guide for Platforms

Currently, we have written step-by-step guides for the following platforms. If you are using them, you can click the link to view directly. After completing the tutorial, you should be able to use the S3 Image Port!

[Cloudflare R2 Step-by-Step Guide](/guide/for-cloudflare-r2)： provides a step-by-step guide on how to configure the S3 settings of this panel when using Cloudflare R2.

### General Requirements

S3 Image Port requires the following information/permissions to work properly:

1. Connection information such as `Endpoint`, `Region`, `Access Key ID`, `Secret Access Key`,
2. A direct link prefix for accessing images, which we call `Public URL`,
3. Correct CORS configuration.

The first point needs no further elaboration; you can refer to how to obtain it yourself.

#### Public URL

In the current version (1.6.0), images in the storage bucket must be directly accessible via a link.

For example, if an image's path in the storage bucket is `i/2024/05/29/name.jpg` and it can be accessed directly (without authentication) via the link `https://i.yfi.moe/i/2024/05/29/name.jpg`, then `https://i.yfi.moe/` is the Public URL you need to fill in.

If you are directly using the "public storage bucket" function of certain S3-compatible services, the same logic applies. For example, for Cloudflare R2, it should look like `https://pub-<a bunch of characters>.r2.dev`. For Tencent Cloud COS, it should look like `https://<BucketName-APPID>.cos.<Region>.myqcloud.com`.

#### CORS Configuration

:::info What is CORS?
**Cross-Origin Resource Sharing** ([CORS](https://developer.mozilla.org/en-US/docs/Glossary/CORS)) is a mechanism that uses [HTTP](https://developer.mozilla.org/en-US/docs/Glossary/HTTP) headers to allow servers to indicate any origins (domain, scheme, or port) other than their own from which a browser should permit loading resources.

In simple terms, if the site `A.com` wants to access resources on the site `B.com`, `B.com` needs to configure CORS to allow it. In this case, `iport.yfi.moe` is like `A.com`, and the link to your S3 storage bucket is like `B.com`. Therefore, we need to configure CORS policies on the S3 storage bucket to allow access requests from `iport.yfi.moe`.
:::

To use it properly, you need to

1. Include `https://iport.yfi.moe` in the allowed Origins,
2. Allow at least the `GET`, `PUT`, and `DELETE` methods,
3. And allow the `*` headers.

If confused, you can check the detailed guide in the [platform step-by-step tutorial](#step-by-step-guide-for-platforms) above for the platform you are using, or refer to the platform documentation yourself.

## Configure S3 Image Port

### Fill in “S3 Settings”

If you have configured the S3 bucket as described above, you should now have all the information needed to fill in the S3 settings! After entering the information, you can click the test button to check if the configuration is correct.

### Fill in “App Settings”

Currently, we have the following four sections of settings. Although their documentation is still being written, their names are descriptive enough to indicate their functions:

- Auto-refresh Gallery
- Fuzzy Search
- Image Conversion and Compression before Upload
- Key (Upload Path) Template.
