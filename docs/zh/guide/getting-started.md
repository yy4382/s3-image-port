---
outline: [2, 4]
---

# 开始使用

## 配置 S3（或其兼容服务）

如您所见，我们是一款用于管理 S3 上图片的应用。尽管我们的应用本身是开箱即用的，但还是需要您自行配置您的 S3 储存桶，简单来讲，这需要 3 步：

1. 在对应平台上创建 S3 兼容的储存桶。
2. 获取访问储存桶所需的端点、密钥等信息。
3. 设置储存桶的访问权限和 CORS。

以上 3 点都是使用 S3 Image Port 必不可少的步骤。

:::warning :red_circle: 需要配置 CORS！
由于我们是一个网页项目，配置 CORS 是必须的。目前用户反馈“连不上”的大多数原因都是没有配置 CORS。

关于如何配置 CORS，请继续阅读。
:::

### 平台逐步指南

目前，我们为以下平台编写了逐步指南，如果这正是你在使用的，可以直接点击链接去那里查看，在做完教程中的内容后，您应该就可以使用 S3 Image Port 了！

[Cloudflare R2 逐步指南](/zh/guide/for-cloudflare-r2) 中提供了如何在使用 Cloudflare R2 的情况下配置 本面板的 S3 设置的逐步指南。

腾讯云 COS 的逐步指南正在编写中。

### 通用要求

S3 Image Port 需要以下信息/权限以正常工作：

1. `Endpoint`, `Region`, `Access Key ID`, `Secret Access Key` 等连接用的信息，
2. 一个直接用来访问图片的链接前缀，我们称之为 `Public URL`，
3. 正确的 CORS 配置。

第一点不多赘述，可以自行查询如何获取。

#### Public URL

在目前版本 (1.6.0) 中，储存桶中的图片必须可以通过一个链接直接访问。

例如，一张图片在储存桶中的路径是 `i/2024/05/29/name.jpg`，而你可以通过 `https://i.yfi.moe/i/2024/05/29/name.jpg` 这个链接直接（不需要验证地）访问到它，那么 `https://i.yfi.moe/` 就是你需要填写的 Public URL.

如果你直接使用了某些 S3 兼容服务的“公开储存桶”功能，也是同理。例如，对于 Cloudflare R2，它应该形如 `https://pub-<一堆字符>.r2.dev`。对于腾讯云 COS，应该形如 `https://<BucketName-APPID>.cos.<Region>.myqcloud.com`

#### CORS 配置

:::info 什么是 CORS？
**跨源资源共享**（[CORS](https://developer.mozilla.org/zh-CN/docs/Glossary/CORS)，或通俗地译为跨域资源共享）是一种基于 [HTTP](https://developer.mozilla.org/zh-CN/docs/Glossary/HTTP) 头的机制，该机制通过允许服务器标示除了它自己以外的其他[源](https://developer.mozilla.org/zh-CN/docs/Glossary/Origin)（域、协议或端口），使得浏览器允许这些源访问加载自己的资源。

简单来讲，就是如果 `A.com` 的网站想要访问 `B.com` 网站上的资源，需要 `B.com` 配置 CORS 来同意。在现在的情况下，`iport.yfi.moe` 相当于 `A.com`，而你的 S3 储存桶的链接类似于 `B.com`，因此我们需要在 S3 储存桶那边配置 CORS 策略来同意来自 `iport.yfi.moe` 的访问请求。
:::

为了正常使用，你需要

1. 将 `https://iport.yfi.moe` 放入允许的 Origin 中，
2. 至少允许 `GET`, `PUT` 和 `DELETE` 方法，
3. 并且允许 `*` header。

如果感到迷惑，可以查看上方的 [平台逐步教程](#平台逐步指南) 中是否有你使用的平台的详细教程，或者自行查询平台文档。

## 配置 S3 Image Port

### 填写“S3 设置”

如果你按上文所说的配置好了 S3 储存桶，那你现在应该已经有了需要填入 S3 设置的所有信息！填入后可以点击测试按钮检查配置是否正确。

### 填写“应用设置”

目前，我们有以下四个板块的设置，关于他们的文档还在编写中，但是从名字足以看出他们的功能：

- 自动刷新图库
- 模糊搜索
- 上传前图片转换和压缩
- Key (上传路径) 模板
