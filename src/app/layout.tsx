import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Provider as JotaiProvider } from "jotai";
import "@/app/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "S3 Image Port",
  icons: {
    icon: "/favicon.svg",
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
