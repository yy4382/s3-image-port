import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { GitHubStarsButton } from "@/components/animate-ui/buttons/github-stars";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Home - S3 Image Port",
  description:
    "Welcome to S3 Image Port. Upload, manage, and view your S3 images with ease.",
};

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("index");

  return (
    <div className="p-2 flex items-center justify-center flex-1">
      <div className="max-w-4xl lg:max-w-[60rem] w-full flex flex-grow flex-col justify-center mx-auto h-full">
        <div className="w-full flex flex-col md:flex-row gap-12 lg:gap-16 items-center px-8 md:px-0">
          <div className="flex flex-col space-y-4 items-center justify-center md:w-full">
            <h1 className="text-center text-5xl md:text-6xl lg:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-br from-violet-400 to-violet-600 pb-2">
              {t.rich("slogan", {
                normal: (c) => (
                  <span className="text-gray-800 dark:text-inherit">{c}</span>
                ),
                br: () => <br />,
              })}
            </h1>
            <div className="flex flex-col space-y-2">
              <p className="text-center text-base md:text-xl lg:text-2xl text-gray-700 dark:text-gray-300">
                {t("description")}
              </p>
              <p className="text-center text-sm md:text-base lg:text-xl text-gray-600 dark:text-gray-400">
                {t("compatibility")}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:gap-4 md:pt-6 justify-center items-center">
              <div className="flex gap-2 sm:gap-4 justify-center items-center">
                <Link href="/onboard">
                  <Button className="hover:scale-105 transition-all duration-300">
                    {t("getStarted")} <ArrowRight size={16} />
                  </Button>
                </Link>
                <a
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "hover:scale-105 transition-all duration-300",
                  )}
                  target="_blank"
                  href={new URL(
                    locale === "zh" ? "/zh" : "/",
                    process.env.NEXT_PUBLIC_DOCS_ORIGIN ??
                      "https://docs.imageport.app",
                  ).toString()}
                >
                  {t("readDocs")}
                </a>
              </div>
              <GitHubStarsButton username="yy4382" repo="s3-image-port" />
            </div>
            {/* TODO: Replace this div with your Checkbox component when available */}
            {/* <div className="pt-2 transition-opacity opacity-40 hover:opacity-80">
              {t("noLongerShow")}
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
