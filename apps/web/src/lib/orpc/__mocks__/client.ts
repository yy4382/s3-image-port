import { createRouterClient } from "@orpc/server";
import { router } from "../router";

export const client = createRouterClient(router);
