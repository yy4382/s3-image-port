import deleteObj from "~/utils/deleteObj";

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as { key: string };
  const runtimeConfig = useRuntimeConfig();
  const { s3Config } = runtimeConfig;
  try {
    const response = await deleteObj(query.key, s3Config);
    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
});
