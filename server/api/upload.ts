import uploadObj from "~/server/utils/uploadObj";

export default defineEventHandler(async (event) => {
  console.log("upload.ts received request.");
  const getBodyStart = performance.now();
  const body = await readBody(event);
  const getBodyEnd = performance.now();
  console.log("upload.ts received body in", getBodyEnd - getBodyStart, "ms");
  const base64Data = body.dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const runtimeConfig = useRuntimeConfig(event);
  const { s3Config } = runtimeConfig;
  try {
    const uploadStart = performance.now();
    const result = await uploadObj(buffer, body.key, s3Config);
    const uploadEnd = performance.now();
    console.log("upload.ts uploaded in", uploadEnd - uploadStart, "ms");
    (result as any).link =
      `${s3Config.endpoint}/${s3Config.bucket}/${body.key}`;
    return result;
  } catch (error) {
    console.error("upload.ts: ", error);
    throw createError({
      statusCode: 502,
      statusMessage: (error as Error).message,
    });
  }
});
