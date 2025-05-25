import type { NextConfig } from "next";
import webpack from "webpack";
import withBundleAnalyzerI from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  webpack(config) {
    config.plugins.push(
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

const withNextIntl = createNextIntlPlugin();

export default withBundleAnalyzer(withNextIntl(nextConfig));
