export default defineEventHandler((event) => {
  const requestURL = getRequestURL(event);
  if (requestURL.pathname.startsWith("/api") && requestURL.pathname !== "/api/heartbeat") {
    const runtimeConfig = useRuntimeConfig();
    const { token } = runtimeConfig;
    const authorization = event.node.req.headers.authorization;
    if (authorization !== "Bearer " + token) {
      console.log("Unauthorized request by ", authorization);
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }
  }
});
