FROM node:20-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/.output /app/.output
EXPOSE 3000
CMD [ "node", ".output/server/index.mjs" ]