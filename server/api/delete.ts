import deleteObj from "~/server/utils/deleteObj";

export default defineEventHandler(async (event) => {
  console.log("delete.ts received request.");
  const query = getQuery(event) as { key: string };
  const runtimeConfig = useRuntimeConfig();
  const { s3Config } = runtimeConfig;
  try {
    const response = await deleteObj(query.key, s3Config);
    return response;
  } catch (error) {
    console.error("delete.ts: ", error);
    throw createError({
      statusCode: 502,
      statusMessage: (error as Error).message,
    });
  }
});
