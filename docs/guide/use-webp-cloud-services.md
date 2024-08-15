# Extending Public URL Functionality with WebP Cloud Services

::: tip Statement
This Project is not affiliated with the "WebP Cloud Services".
:::

When using image hosting services, you often want to optimize your images for web distribution, such as resizing or changing formats. This application already provides some of these features, which you can view and configure in the `S3 Settings`, including pre-upload format conversion and compression. Here, we introduce another solution using the third-party service [WebP Cloud Services](https://webp.se/). They offer an image proxy service that allows you to easily render your images using modern formats, thereby improving your website's loading speed.

How does it work, and how can you use their service? Please refer to their [official documentation](https://docs.webp.se/webp-cloud/basic/) for detailed information.

After configuring your settings on the WebP Cloud Services platform, to enable proxied image URLs in this application, you only need to modify the `Public URL` in your S3 bucket settings. Simply replace your original configuration (e.g., `https://i.yfi.moe`) with the proxy address assigned by WebP Cloud Services (e.g., `https://example.webp.ee`).
