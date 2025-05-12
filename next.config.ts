import type { NextConfig } from "next";
import Icons from "unplugin-icons/webpack";
import webpack from "webpack";
import withBundleAnalyzerI from "@next/bundle-analyzer";

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

const withBundleAnalyzer = withBundleAnalyzerI({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
