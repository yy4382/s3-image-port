import { Upload } from "@/components/upload/upload";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Images - S3 Image Port",
  description: "Upload new images to your S3 bucket.",
};

export default function Page() {
  return <Upload />;
}
