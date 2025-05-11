// app/client.tsx
/// <reference types="vinxi/types/client" />
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start";
import { createRouter } from "./router";

const router = createRouter(window.location.pathname);

hydrateRoot(document, <StartClient router={router} />);
