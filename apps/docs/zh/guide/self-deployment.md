# 自部署指南

[[toc]]

自从 v1.7.0 以来，我们放弃了使用服务器渲染，而只使用静态文件。这使得自部署变得更加容易。

## 静态部署

由于是静态网站，所以只要将生成的文件部署到任何支持静态文件的服务器上即可，
无论是放到 GitHub Pages，还是放到自己的服务器上。

可以在 [Release 页面](https://github.com/yy4382/s3-image-port/releases) 下载 `static.tar.gz`，解压后就是静态文件。

Caddyfile 配置示例：

```caddy
your.domain {
    # 设置网站根目录为解压的文件夹
    root * /your_path_to_files
    # 启用文件服务器
    file_server
    # 启用压缩
    encode zstd gzip
}
```

Nginx 配置示例（AI 编写，未测试，如果有更好的示例请提 [PR](https://github.com/yy4382/s3-image-port/pulls)）：

```nginx
server {
    listen 80;
    server_name your_domain.com;  # 替换为你的域名或 IP

    # 静态文件目录配置
    location / {
        root /your_path;  # 替换为你的静态文件目录
        index index.html index.htm;

        # 启用目录浏览（可选）
        autoindex on;

        # 尝试寻找文件，如果不存在则返回 404
        try_files $uri $uri/ =404;
    }

    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1000;
}
```

## Docker 部署（不再推荐）

::: warning 为什么不再推荐？
自从本项目变成静态网站以来，Docker 部署陷入了一个比较尴尬的境地：用户终究需要使用 Nginx、Caddy 或者其他 Web 服务器来提供 HTTPS 访问，但是这些工具本身就支持直接部署静态文件，用 Docker 先 serve 这些静态文件到一个端口，再用 Nginx 或者 Caddy 反向代理到这个端口，有些多此一举了。

因此，我们推荐直接使用 Nginx、Caddy 或者其他 Web 服务器来直接部署静态文件。
:::

为了向后兼容，我们依旧提供 Docker 部署的方式。

自 v1.8.1 开始，我们提供的 Docker 镜像仅仅是一个简单的 `python http.server`，体积非常小，内部使用 3000 端口。

直接运行：

```bash
docker run -p 3000:3000 -d yunfinibol/s3-image-port:latest
```

Docker compose 配置：

```yaml
name: s3-image-port
services:
  s3-image-port:
    ports:
      - 3000:3000
    image: yunfinibol/s3-image-port:latest
```

之后使用 Nginx 或者 Caddy 反向代理 3000 端口即可。
