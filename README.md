# S3 Image Port

[English](README.md) · [简体中文](/docs/README-zh.md)

A custom front-end panel designed to manage images hosted on **S3-like** storage services (e.g. Cloudflare R2), where traditionally no dedicated image management panel exists. This solution provides a simple yet powerful interface for **uploading**, **managing**, and **integrating** images into your projects.

![poster](/docs/images/devices.png)
![homepage](/docs/images/index-page.jpg)
![upload](/docs/images/upload-page.jpg)
![photos](/docs/images/gallery-page.jpg)

## Live Instance and Deployment

A public instance is hosted at [Vercel](https://vercel.com) and can be accessed at [iport.yfi.moe](https://iport.yfi.moe). You can start using it immediately by entering your specific S3 settings under the Settings tab.

While it is open-source and all your data remains in your local browser without being uploaded. you have the option to fork the repository and deploy it on your own Vercel account or server.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyy4382%2Fs3-image-port)

## Features

- :cloud: **Upload Photos**: Easily upload your images with support for automatic compression and format conversion.
- :framed_picture: **Display Image List**: View and find all uploaded images in the gallery, support filtering options.
- :link: **Copy Image Links**: One-click copying of links to uploaded images in raw or markdown format.
- :wastebasket: **Delete Images**: Remove images from your bucket directly through the panel.

The interface is fully responsive and works seamlessly on mobile devices as well.

## Usage

Before using the application, configure your S3 settings in the Settings tab. Required fields include the S3 endpoint, bucket name, region, and two keys (access key and secret key). Optional advanced settings like setting a public URL format are available if your S3 bucket uses a custom domain.

For obtaining S3 related keys, please refer to the documentation of your storage service provider. If you are using Cloudflare R2 Storage, you can check out the [Step-By-Step Guide for Cloudflare R2](https://docs.iport.yfi.moe/guide/for-cloudflare-r2).

You can then customize this application to a certain extent. Go to the `App Settings` page and you can configure some important options. Particularly, if you want to modify the key template, you should carefully read the [Special Note on `Key (Path) Template`](#special-note-on-key-path-template).

### Special Note on `Key (Path) Template`

> [!CAUTION]
> MODIFY THIS OPTION AT YOUR OWN RISK! If the new key collides with the existing key, the existing file is **overwritten**.

This option provides a way to customize the **path** to the uploaded image in the storage bucket, also known as the `key`. By default, its value is `i/{{year}}/{{month}}/{{day}}/{{random}}.{{ext}}`, which means that if you upload a `png` image on 2024-05-15, the relative path of your image in the bucket might be `i/2024/05/15/kgj7e-1z.png`.

Available placeholders (or variables) include `year`, `month`, `day`, `random`, `filename`, `ext`. They should be enclosed in `{{` and `}}` otherwise they can't be parsed dynamically.

The random placeholder is not completely random. It concatenates the milliseconds from 0 am and a two-digit random number to generate the value. Therefore, it is recommended to use it together with year, month and/or day.

## Feedback and Contributions

Feel free to raise an [Issue](https://github.com/yy4382/s3-image-port/issues/new/choose) if you encounter any problems or have suggestions.

If you have ideas for new features, don’t hesitate to create an [Issue](https://github.com/yy4382/s3-image-port/issues/new/choose)for those as well—no idea is too far-fetched!
