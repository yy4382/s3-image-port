import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="p-2 flex items-center justify-center flex-1">
      <div className="max-w-4xl lg:max-w-[60rem] w-full flex flex-grow flex-col justify-center mx-auto h-full">
        <div className="w-full flex flex-col md:flex-row gap-12 lg:gap-16 items-center px-8 md:px-0">
          <div className="flex flex-col space-y-4 items-center justify-center md:w-full">
            <h1 className="text-center text-5xl md:text-6xl lg:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-br from-violet-400 to-violet-600 pb-2">
              {/* {t.rich("index.slogan", {
              normal: (c) => (
                <span className="text-gray-800 dark:text-inherit">{c}</span>
              ),
              br: () => <br />,
            })} */}
              <span className="text-gray-800 dark:text-inherit">Your</span>{" "}
              Ultimate
              <br />
              <span className="text-gray-800 dark:text-inherit">
                Manager of Images in S3 Buckets
              </span>
            </h1>
            <div className="flex flex-col space-y-2">
              <p className="text-center text-base md:text-xl lg:text-2xl text-gray-700 dark:text-gray-300">
                Upload, view and delete images in your S3 bucket with ease
              </p>
              <p className="text-center text-sm md:text-base lg:text-xl text-gray-600 dark:text-gray-400">
                Also works with lots of S3-compatible services
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4 md:pt-6 justify-center items-center">
              <Link
                className={buttonVariants({ variant: "default" })}
                href="/upload"
              >
                Get Started
              </Link>
              <a
                className={buttonVariants({ variant: "secondary" })}
                href="https://docs.iport.yfi.moe"
              >
                Read Docs
              </a>
              <a
                className={buttonVariants({ variant: "ghost" })}
                href="https://github.com/yy4382/s3-image-port"
              >
                View Source
              </a>
            </div>
            {/* TODO: Replace this div with your Checkbox component when available */}
            <div className="pt-2 transition-opacity opacity-40 hover:opacity-80">
              {/* Placeholder for Checkbox: {t("index.noLongerShow")} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
