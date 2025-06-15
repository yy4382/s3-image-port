import type { NextConfig } from "next";
import Icons from "unplugin-icons/webpack";
import webpack from "webpack";
import withBundleAnalyzerI from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

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
  experimental: {
    reactCompiler: true,
  },
};

const withBundleAnalyzer = withBundleAnalyzerI({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin();

export default withBundleAnalyzer(withNextIntl(nextConfig));
