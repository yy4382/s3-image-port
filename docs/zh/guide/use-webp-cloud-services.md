# 利用 WebP Cloud Services 扩展 Public URL 功能

在使用图床服务时，您可能希望对图片进行优化，如调整大小或转换格式，以便更适合网络传播。本应用已内置部分此类功能，您可在 `S3 存储桶设置` 中查看并配置，包括上传前的图片格式转换和压缩等。此外，我们还推荐另一种方案 —— 借助第三方服务 [WebP Cloud Services](https://webp.se/)。该服务提供图片代理功能，让您能轻松使用现代图片格式来呈现图像，从而提升网站访问速度。

想了解 WebP Cloud Services 的工作原理及使用方法？请参阅他们的[官方文档](https://docs.webp.se/webp-cloud/basic/)。

完成 WebP Cloud Services 平台配置后，要在本应用中启用代理后的图片地址，只需在 S3 存储桶设置中修改 `Public URL`。将原有配置（如 `https://i.yfi.moe`）替换为 WebP Cloud Services 分配的代理地址（如 `https://example.webp.ee`）即可。
