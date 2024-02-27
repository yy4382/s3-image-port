import listObj from "~/utils/listObj";

export default defineEventHandler(async (event) => {
    const runtimeConfig = useRuntimeConfig();
    const { s3Config } = runtimeConfig;
    const photos = await listObj(s3Config);
    return {
        statusCode: 200,
        body: JSON.stringify(photos),
    };
})