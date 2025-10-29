import { createFileRoute } from "@tanstack/react-router";
import { source } from "@/lib/docs/source";
import { createFromSource } from "fumadocs-core/search/server";
import { createTokenizer } from "@orama/tokenizers/mandarin";

const server = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  localeMap: {
    en: { language: "english" },
    zh: {
      components: { tokenizer: createTokenizer() },
      search: { threshold: 0, tolerance: 2 },
    },
  },
});

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async () => server.staticGET(),
    },
  },
});
