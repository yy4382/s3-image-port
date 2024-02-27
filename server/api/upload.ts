import uploadObj from "~/utils/uploadObj";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const base64Data = body.dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const runtimeConfig = useRuntimeConfig();
  const { s3Config } = runtimeConfig;
  try {
    const result = await uploadObj(buffer, body.key, s3Config);
    return {
      statusCode: 200,
      link: `${s3Config.endpoint}/${s3Config.bucket}/${body.key}`,
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
});
