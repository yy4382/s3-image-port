import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Provider as JotaiProvider } from "jotai";
import "@/app/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://iport.yfi.moe"),
  title: "S3 Image Port",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "S3 Image Port",
    description: "Manage your images in S3",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "S3 Image Port Site Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "S3 Image Port",
    description: "Manage your images in S3",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <JotaiProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="s3ip:root:theme"
          >
            {children} <Toaster />
          </ThemeProvider>
        </JotaiProvider>
      </body>
    </html>
  );
}
