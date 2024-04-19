import { type S3Config, s3ConfigSchema } from "~/types";
import { S3Client } from "@aws-sdk/client-s3";

export default function (s3Settings: S3Config): S3Client {
  s3ConfigSchema.parse(s3Settings);
  return new S3Client({
    region: s3Settings.region,
    credentials: {
      accessKeyId: s3Settings.accKeyId,
      secretAccessKey: s3Settings.secretAccKey,
    },
    endpoint: s3Settings.endpoint,
  });
}
