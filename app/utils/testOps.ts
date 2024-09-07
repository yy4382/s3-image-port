import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { S3Settings } from "~/types";

const checkGrantedToUpload = async (
  s3Settings: S3Settings,
  key: string,
  content: string,
) => {
  try {
    debug("Checking if granted to upload...");
    await new ImageS3Client(s3Settings).upload(content, key);
    debug("Granted to upload!");
    return true;
  } catch (e) {
    return false;
  }
};

const checkGrantedToList = async (s3Settings: S3Settings) => {
  try {
    debug("Checking if granted to list...");
    await new ImageS3Client(s3Settings).list(true);
    debug("Granted to list!");
    return true;
  } catch (e) {
    return false;
  }
};

const checkGrantedToDelete = async (s3Settings: S3Settings, key: string) => {
  try {
    debug("Checking if granted to delete...");
    await new ImageS3Client(s3Settings).delete(key);
    debug("Granted to delete!");
    return true;
  } catch (e) {
    return false;
  }
};

const checkObjectExists = async (s3Settings: S3Settings, key: string) => {
  debug("Checking if object exists...");
  try {
    const client = new ImageS3Client(s3Settings).client;
    await client.send(
      new GetObjectCommand({
        Bucket: s3Settings.bucket,
        Key: key,
      }),
    );
    debug("Object exists!");
    return true;
  } catch (e) {
    if (!(e instanceof Error)) {
      debug("Unknown error!", e);
      throw new Error("Unknown error when checking object existence!");
    }
    if (e.message.includes("NoSuchKey")) {
      debug("Object does not exist!", e);
    } else if (e.message.includes("fetch")) {
      console.error("Config error or CORS issue!");
      throw e;
    }
    return false;
  }
};

export {
  checkGrantedToUpload as upload,
  checkGrantedToList as list,
  checkGrantedToDelete as del,
  checkObjectExists as exists,
};
