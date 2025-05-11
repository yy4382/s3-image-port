import type { NextConfig } from "next";
import Icons from "unplugin-icons/webpack";
import webpack from "webpack";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  webpack(config) {
    config.plugins.push(
      Icons({
        compiler: "jsx",
        jsx: "react",
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /avif_enc_mt.worker/,
      }),
    );

    return config;
  },
  /* config options here */
};

export default nextConfig;
