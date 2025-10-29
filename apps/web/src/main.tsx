import { createRouter } from "@tanstack/react-router";
import messages from "../messages/en.json";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultHashScrollIntoView: { behavior: "smooth" },
  });
  return router;
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

declare module "use-intl" {
  interface AppConfig {
    // ...
    Messages: typeof messages;
  }
}
