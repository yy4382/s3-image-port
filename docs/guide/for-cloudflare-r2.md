# Step-By-Step Guide for Cloudflare R2

::: info Cloudflare R2
Cloudflare R2 Storage allows developers to store large amounts of unstructured data without the costly egress bandwidth fees associated with typical cloud storage services.
:::

Cloudflare R2 Storage's free plan includes 10 GB of storage per month, 1 million Class A operation requests per month, and 10 million Class B operation requests per month, which, combined with its no-egress-fee feature, makes it a good choice for cloud storage for small personal image hosting service.

This guide will take you step-by-step through how to configure R2 storage buckets, starting with turning on Cloudflare R2 Storage, and building a small image hosting service that is unique to you, in conjunction with S3 Image Port.

This guide will only cover the necessary parts related to S3 Image Port, for more information on R2, see [Cloudflare R2 - Cloudflare R2 docs](https://developers.cloudflare.com/r2/).

## Creating a Storage Bucket

You need an "R2 Storage Bucket" as a container for your images. To do this:

- Go to [Cloudflare dashboard](https://dash.cloudflare.com/) and select R2 on the left;
- Select `Create Bucket`;
- Fill in a name for this bucket, keep the location as `Automatic` and click `Create Bucket`.

## Exposing Your Bucket

Since we are creating a image hosting service, we must make the contents of this R2 storage bucket public.
There are two ways: make it public as a Cloudflare-managed subdomain under `https://r2.dev`, or expose it as a custom domain.

### Exposing as a Cloudflare-Managed Subdomain

- Go to [Cloudflare dashboard](https://dash.cloudflare.com/) and select R2 on the left;
- Select the storage bucket you just created;
- Click `Settings`, and to the right of the `R2.dev subdomain` of the `Public access` board, click `Allow Access`, and type `allow` to confirm permission;
- The `Public R2.dev Bucket URL` is now your `Public URL`.

For more information, see [Public buckets - Cloudflare R2 docs](https://developers.cloudflare.com/r2/buckets/public-buckets/)

### Exposing as a Custom Domain

- Go to [Cloudflare dashboard](https://dash.cloudflare.com/) and select R2 on the left;
- Select the storage bucket you just created;
- Click `Settings`, and click the "Connect Domain" button on the right side of the "Custom Domains" title
- Use a subdomain of your domain hosted on Cloudflare. For example, I'm using `i.yfi.moe` for my domain `yfi.moe`.
- That's it! Now your Public URL is `https://i.yfi.moe` or whatever you set it to be.

## Configuring CORS

In order for S3 Image Port to be able to access and manipulate your data in Cloudflare R2 storage buckets across domains, you need to configure the bucket's [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS):

- Go to [Cloudflare dashboard](https://dash.cloudflare.com/) and select R2 on the left;
- Select the storage bucket you just created;
- Click `Settings` and on the right side of the `CORS Policy` board click `Add/Edit CORS Policy` and modify it as you wish.

Below is an example of a CORS policy that makes the [official instance](https://iport.yfi.moe) work:

```json
[
  {
    "AllowedOrigins": ["https://iport.yfi.moe"],
    "AllowedMethods": ["GET", "PUT", "DELETE"],
    "AllowedHeaders": ["*"]
  }
]
```

For more information, see [Configure CORS - Cloudflare R2 docs](https://developers.cloudflare.com/r2/buckets/cors/)

## Getting the Keys

On the `S3 Settings` page of the S3 Image Port, you need to fill in the `Access Key ID` and `Secret Access Key` keys as credentials to access the storage bucket. To do this:

- Go to [Cloudflare dashboard](https://dash.cloudflare.com/) and select R2 on the left;
- Click `Manage R2 API Tokens` under `Account details`;
- Click `Create API Token` and set up the token as you want it (e.g. permissions are `Object Read & Write`, Specify bucket(s) as the one you just created);
- Click `Create API Token`, and on the next page under `Use the following credentials for S3 clients` you will find `Access Key ID` and `Secret Access Key`.

Note: For security reasons, this page will only appear once.

For more information, see [Authentication - Cloudflare R2 docs](https://developers.cloudflare.com/r2/api/s3/tokens/)

## Checking the Endpoint

- Go to [Cloudflare dashboard](https://dash.cloudflare.com/) and select R2 on the left;
- Select the bucket you just created;
- Under the `Bucket Details` board, there is a field called `S3 API`, which ends with the name of your bucket, and the Endpoint is the result of removing that part (e.g. if the `S3 API` is `https://example.r2.cloudflarestorage.com/example`, then the Endpoint is `https://example.r2.cloudflarestorage.com/`).

## Fill in S3 Image Port's Settings Page

Now that you have configured your Cloudflare R2 storage bucket, simply fill in the key information obtained above on the S3 Image Port's settings page and you are ready to start using the S3 Image Port.

Recall the source of the settings fields:

- `Endpoint`: see [Checking the Endpoint](#checking-the-endpoint)
- `Bucket Name`: your customized bucket name, see [Creating a Storage Bucket](#creating-a-storage-bucket)
- `Region`: should be `auto` by default, see [Creating a Storage Bucket](#creating-a-storage-bucket)
- `Access Key ID`: see [Getting the Keys](#getting-the-keys)
- `Secret Access Key`: see [Getting the Keys](#getting-the-keys)
- `Public URL`: see [Exposing your bucket](#exposing-your-bucket)
