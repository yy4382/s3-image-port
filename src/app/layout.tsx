import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import "@/app/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="s3ip:root:theme"
        >
          {children} <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
