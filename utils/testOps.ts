import uploadObj from "~/utils/uploadObj";
import listObj from "~/utils/listObj";
import deleteObj from "~/utils/deleteObj";
import { S3 } from "@aws-sdk/client-s3";

const { s3Settings } = useValidSettings();

export const checkGrantedToUpload = async (key: string, content: string) => {
  try {
    console.log("Checking if granted to upload...");
    await uploadObj(content, key, s3Settings.value);
    console.log("Granted to upload!");
    return true;
  } catch (e) {
    return false;
  }
}

export const checkGrantedToList = async () => {
  try {
    console.log("Checking if granted to list...");
    await listObj(s3Settings.value);
    console.log("Granted to list!");
    return true;
  } catch (e) {
    return false;
  }
}

export const checkGrantedToDelete = async (key: string) => {
  try {
    console.log("Checking if granted to delete...");
    await deleteObj(key, s3Settings.value);
    console.log("Granted to delete!");
    return true;
  } catch (e) {
    return false;
  }
}

export const checkObjectExists = (key: string) => {
  console.log("Checking if object exists...");
  (new S3(s3Settings.value)).getObject({
    Bucket: s3Settings.value.bucket,
    Key: key
  }).then(() => {
    console.log("Object exists!");
    return true;
  }).catch(() => {
    console.log("Object does not exist!");
    return false;
  })
}