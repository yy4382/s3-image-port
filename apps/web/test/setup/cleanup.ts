import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";
import "vitest-browser-react";

import "@/styles/globals.css";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
