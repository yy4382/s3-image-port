# S3 Image Port

[English](README.md) · [简体中文](/README-zh.md)

S3 Image Port is a control panel for managing images in your AWS S3 buckets or any S3-compatible service (like Cloudflare R2, DigitalOcean Spaces, etc.).

> Unlike traditional image hosting services, S3 Image Port does not store your images or handle the delivery. It only provides a management interface. We designed it to be a **no vendor lock-in** solution: your images reside in your own S3 bucket, completely independent of this project. Even if S3 Image Port were to go offline, you would not need to migrate anything.

The panel itself is stateless and doesn't store any of your data.

Start using at <https://imageport.app>!

## Features

- :cloud: **Upload Photos**: Easily upload your images with support for automatic compression and format conversion.
- :framed_picture: **Display Image List**: View and find all uploaded images in the gallery, support filtering options.
- :link: **Copy Image Links**: One-click copying of links to uploaded images in raw or markdown format.
- :wastebasket: **Delete Images**: Remove images from your bucket directly through the panel.

## Not an Image Hosting Service

S3 Image Port is not an image hosting service in the traditional sense. A typical image host stores and serves your images. S3 Image Port doesn't store your files or get involved in the access flow. This has several advantages:

- **Your data is yours**: Your images are in your own S3 bucket. If this project disappears, your images and their access are unaffected.
- **No extra database**: Traditional hosts often have a database for metadata. If that's lost, recovery is hard. Here, everything is just files in your bucket.
- **Customizable access path**: Since the panel doesn't serve the images, you have full control over the image URLs.

## Usage

Before using the application, you need to configure your S3 settings. For a detailed guide, please refer to our [Getting Started documentation](https://docs.imageport.app/guide/getting-started).

For obtaining S3 related keys, please refer to the documentation of your storage service provider. If you are using Cloudflare R2 Storage, you can check out the [Step-By-Step Guide for Cloudflare R2](https://docs.imageport.app/guide/for-cloudflare-r2).

You can also customize this application to a certain extent. Go to the `Settings` page and you can configure some important options.

## Feedback and Contributions

Feel free to raise an [Issue](https://github.com/yy4382/s3-image-port/issues/new/choose) if you encounter any problems or have suggestions.

If you have ideas for new features, don’t hesitate to create an [Issue](https://github.com/yy4382/s3-image-port/issues/new/choose)for those as well—no idea is too far-fetched!
