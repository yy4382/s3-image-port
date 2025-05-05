import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { enableMapSet } from "immer";
enableMapSet();

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
// const router = createRouter({ routeTree });
export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
  });

  return router;
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}

// Render the app
// const rootElement = document.getElementById("root")!;
// if (!rootElement.innerHTML) {
//   const root = ReactDOM.createRoot(rootElement);
//   root.render(
//     <StrictMode>
//       <RouterProvider router={router} />
//     </StrictMode>,
//   );
// }
