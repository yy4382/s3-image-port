# Cloudflare R2 逐步指南

::: info Cloudflare R2
Cloudflare R2 Storage 允许开发人员存储大量非结构化数据，而无需支付与典型云存储服务相关的昂贵出口带宽费用。
:::

Cloudflare R2 Storage 的免费计划包含每月 10 GB 的存储空间、每月 100 万次 A 类操作请求和每月 1,000 万次 B 类操作请求，加之其无出口费用的特点，使之成为了个人小型图床云存储的良好选择。

本指南将从开通 Cloudflare R2 Storage 开始，一步一步带您了解如何进行配置 R2 存储桶，并配合 S3 Image Port 构建一个独属于您的小型图床。

本指南只会涉及与 S3 Image Port 相关的必要部分，关于 R2 的更多信息，请参阅 [Cloudflare R2 · Cloudflare R2 docs](https://developers.cloudflare.com/r2/)。

## 创建存储桶

您需要一个 “R2 存储桶” 作为存放图片的容器。为此：

- 前往 [Cloudflare dashboard](https://dash.cloudflare.com/) 并在左侧选择 R2；
- 选择 `创建存储桶`；
- 为此存储桶填入一个名称，保持位置为 `自动` ，然后点击 `创建存储桶`。

## 公开您的存储桶

由于我们是在创建一个图床服务，所以我们必须使该 R2 存储桶的内容是公开的。有两种方法：以 Cloudflare 管理的子域的形式在 `r2.dev` 下公开，或是使用自己的域名：

### 以 Cloudflare 管理的子域的形式公开

- 前往 [Cloudflare dashboard](https://dash.cloudflare.com/) 并在左侧选择 R2；
- 选择您刚刚创建的存储桶；
- 点击 `设置`，在 `公开访问` 板块的 `R2.dev 子域` 右侧，点击 `允许访问`，键入 `allow` 以确认允许；
- 现在 `公共 R2.dev 存储桶 URL` 即为您的 `Public URL`。

更多信息，请查看 [Public buckets · Cloudflare R2 docs](https://developers.cloudflare.com/r2/buckets/public-buckets/)

### 以自定义域名的形式公开

- 前往 [Cloudflare dashboard](https://dash.cloudflare.com/) 并在左侧选择 R2；
- 选择您刚刚创建的存储桶；
- 点击 `设置`，在 `自定义域名` 标题右侧的 `连接域名` 按钮；
- 使用您在 Cloudflare 上托管的域名的子域名。例如，该项目的作者 [@Yunfi](https://github.com/yy4382) 使用 `i.yfi.moe` 作为其域名 `yfi.moe` 的子域名；
- 完成！现在您的 `Public URL` 即为 `https://i.yfi.moe` 或您设置的任何内容。

## 配置 CORS

为了让 S3 Image Port 能够跨域访问并操作您位于 Cloudflare R2 存储桶中的数据，您需要配置存储桶的 [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)：

- 前往 [Cloudflare dashboard](https://dash.cloudflare.com/) 并在左侧选择 R2；
- 选择您刚刚创建的存储桶；
- 点击 `设置`，在 `CORS 策略` 板块右侧点击 `添加/编辑 CORS 策略`，并按您的需要进行修改。

下面是使 [官方实例](https://imageport.app) 能正常工作的一个 CORS 策略的例子：

```json
[
  {
    "AllowedOrigins": ["https://imageport.app"],
    "AllowedMethods": ["GET", "PUT", "DELETE", "HEAD", "POST"],
    "AllowedHeaders": ["*"]
  }
]
```

更多信息，请查看 [Configure CORS · Cloudflare R2 docs](https://developers.cloudflare.com/r2/buckets/cors/)

## 获取密钥

在 S3 Image Port 的 `S3 存储桶设置` 页面，您需要填入 `Access Key ID` 和 `Secret Access Key` 两个密钥作为访问存储桶的凭证。为此：

- 前往 [Cloudflare dashboard](https://dash.cloudflare.com/) 并在左侧选择 R2；
- 点击 `账户详细信息` 下的 `管理 R2 API 令牌`；
- 点击 `创建 API 令牌`，并按照您的需要设置该令牌（例如，权限为 `对象读和写`，指定存储桶为您刚刚创建的存储桶）；
- 点击 `创建 API 令牌`，在下一个页面的 `为 S3 客户端使用以下凭据` 下的 `访问密钥 ID` 和 `机密访问密钥`，即分别对应着 `Access Key ID` 和 `Secret Access Key`。

注意：出于安全原因，该页面只会出现一次。

更多信息，参见 [Authentication · Cloudflare R2 docs](https://developers.cloudflare.com/r2/api/s3/tokens/)

## 查看 Endpoint

- 前往 [Cloudflare dashboard](https://dash.cloudflare.com/) 并在左侧选择 R2；
- 选择您刚刚创建的存储桶；
- 在 `存储桶详细信息` 板块下，有名为 `S3 API` 的字段，该字段的最后是您存储桶的名字，而 Endpoint 即是去除该部分后的结果（例如，`S3 API` 为 `https://example.r2.cloudflarestorage.com/example`，则 Endpoint 为 `https://example.r2.cloudflarestorage.com/`）。

## 在 S3 Image Port 的设置页面填写上述信息

现在，您已经配置好了您的 Cloudflare R2 存储桶，只需将上面获得的关键信息填入 S3 Image Port 的设置页，就可以开始使用 S3 Image Port 了。

回顾设置字段的来源：

- `Endpoint`: 参见 [查看 Endpoint](#查看-endpoint)
- `Bucket Name`: 您自定义的存储桶名称，参见 [创建存储桶](#创建存储桶)
- `Region`: 默认应该为 `auto`，参见 [创建存储桶](#创建存储桶)
- `Access Key ID`: 参见 [获取密钥](#获取密钥)
- `Secret Access Key`: 参见 [获取密钥](#获取密钥)
- `Public URL`: 参见 [公开您的存储桶](#公开您的存储桶)
