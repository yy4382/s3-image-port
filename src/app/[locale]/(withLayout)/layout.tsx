import Header from "@/components/header/Header";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "S3 Image Port",
  description: "Manage and view your S3 images with S3 Image Port.",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <div className="fixed top-0 bottom-0 left-0 right-0 -z-10 bg-grid-image dark:hidden"></div>
      <div className="dark:bg-background text-foreground min-h-screen w-screen flex flex-col gap-6">
        <div className="p-2 flex gap-2 max-w-7xl mx-auto px-4 w-full">
          <Header />
        </div>

        <div className="max-w-7xl mx-auto px-4 w-full flex-1 flex">
          {children}
        </div>
      </div>
    </>
  );
}
