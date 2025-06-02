# Self-Deployment Guide

[[toc]]

::: info
Translated from [zh-CN](/zh/guide/self-deployment) by GPT-4o-mini.
:::

Since v1.7.0, we have abandoned server rendering and only use static files. This makes self-deployment much easier.

## Static Deployment

As it is a static website, you only need to deploy the generated files to any server that supports static files, whether it's on GitHub Pages or your own server.

You can download `static.tar.gz` from the [Release page](https://github.com/yy4382/s3-image-port/releases), and after extracting, you will have the static files.

Caddyfile Configuration Example:

```txt
your.domain {
    # Set the website root directory to the extracted folder
    root your_path_to_files

    # Enable file server
    file_server

    # Enable compression
    encode zstd gzip
}
```

Nginx Configuration Example (AI generated, untested; if you have a better example, please submit a [PR](https://github.com/yy4382/s3-image-port/pulls)):

```nginx
server {
    listen 80;
    server_name your_domain.com; # Replace with your domain or IP

    # Static file directory configuration
    location {
        root your_path; # Replace with your static file directory
        index index.html index.htm;

        # Enable directory browsing (optional)
        autoindex on;

        # Try to find the file, return 404 if it doesn't exist
        try_files $uri $uri =404;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1000;
}
```

## Docker Deployment (No longer recommended)

::: warning Why is it no longer recommended?
Since this project has become a static website, Docker deployment has become somewhat awkward: users ultimately need to use Nginx, Caddy, or other web servers to provide HTTPS access, but these tools themselves support directly deploying static files. Using Docker to serve these static files to a port and then using Nginx or Caddy to reverse proxy to that port seems redundant.

Therefore, we recommend directly using Nginx, Caddy, or other web servers to deploy static files.
:::

To maintain backward compatibility, we still provide a Docker deployment option.

Starting from v1.8.1, the Docker image we provide is simply a lightweight `python http.server`, using port 3000 internally.

Run directly:

```bash
docker run -p 3000:3000 -d yunfinibol/s3-image-port:latest
```

Docker Compose Configuration:

```yaml
name: s3-image-port

services:
  s3-image-port:
    ports:
      - 3000:3000
    image: yunfinibol/s3-image-port:latest
```

Then use Nginx or Caddy to reverse proxy to port 3000.
