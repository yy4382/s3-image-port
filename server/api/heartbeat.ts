export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event);
  const { token, s3Config } = runtimeConfig;
  console.log("heartbeat.ts received request.");
  const errors: string[] = [];
  if (!token) {
    errors.push("token");
  }
  for (const key of Object.keys(s3Config)) {
    if (!s3Config[key]) {
      errors.push(`s3Config.${key}`);
    }
  }
  if (errors.length > 0) {
    return {
      status: "error",
      message: `Missing runtime config:\n ${errors.join(", ")}`,
    };
  } else {
    return {
      status: "ok",
    };
  }
});
