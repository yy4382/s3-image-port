import listObj from "~/server/utils/listObj";

export default defineEventHandler(async (event) => {
  console.log("list.ts received request.");
  const runtimeConfig = useRuntimeConfig(event);
  const { s3Config } = runtimeConfig;
  try {
    const photos = await listObj(s3Config);
    return {
      statusCode: 200,
      body: JSON.stringify(photos),
    };
  } catch (error) {
    console.error("list.ts: ", error);
    throw createError({
      statusCode: 502,
      statusMessage: (error as Error).message,
    });
  }
});
