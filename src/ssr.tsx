/// <reference types="vinxi/types/server" />
import {
  createStartHandler,
  defaultStreamHandler,
  defineEventHandler,
} from "@tanstack/react-start/server";
import { getRouterManifest } from "@tanstack/react-start/router-manifest";

import { createRouter } from "./router";
import { paraglideMiddleware } from "./paraglide/server.js";
import { getWebRequest } from "vinxi/http";

export default defineEventHandler((event) =>
  paraglideMiddleware(getWebRequest(event), async () =>
    createStartHandler({
      createRouter: () => createRouter(event.path),
      getRouterManifest,
    })(defaultStreamHandler)(event),
  ),
);
