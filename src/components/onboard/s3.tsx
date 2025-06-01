import { S3Settings } from "../settings/s3";

export function S3Onboard() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">
        Getting your S3 bucket ready
      </h2>
      <p className="">
        Here&apos;s the most important and tricky part.
        <br /> You need to fill in the following information to use S3 as your
        image storage.
      </p>
      <div className="max-h-[60vh] overflow-y-auto px-2 mt-6">
        <S3Settings showTitle={false} />
      </div>
    </div>
  );
}
