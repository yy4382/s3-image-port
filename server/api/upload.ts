import uploadObj from "~/server/utils/uploadObj";

export default defineEventHandler(async (event) => {
  console.log("upload.ts received request.");
  const body = await readBody(event);
  const base64Data = body.dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const runtimeConfig = useRuntimeConfig();
  const { s3Config } = runtimeConfig;
  try {
    const result = await uploadObj(buffer, body.key, s3Config);
    (result as any).link = `${s3Config.endpoint}/${s3Config.bucket}/${body.key}`;
    return result;
  } catch (error) {
    console.error("upload.ts: ", error);
    throw createError({
      statusCode: 502,
      statusMessage: (error as Error).message,
    });
  }
});
