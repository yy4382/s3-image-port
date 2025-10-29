import { loader } from "fumadocs-core/source";
import { create, docs } from "@/.source";
import { i18n } from "./i18n";

export const source = loader({
  i18n,
  source: await create.sourceAsync(docs.doc, docs.meta),
  baseUrl: "/docs",
});
