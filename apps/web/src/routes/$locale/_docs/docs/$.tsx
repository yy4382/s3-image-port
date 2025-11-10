import { createFileRoute, notFound } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { createServerFn } from "@tanstack/react-start";
import { source } from "@/lib/docs/source";
import type * as PageTree from "fumadocs-core/page-tree";
import { useMemo } from "react";
import { docs } from "@/.source";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { createClientLoader } from "fumadocs-mdx/runtime/vite";
import { baseOptions } from "@/lib/docs/layout";
import { createHeadTags } from "@/lib/seo";
// import { staticFunctionMiddleware } from "@tanstack/start-static-server-functions";

const clientLoader = createClientLoader(docs.doc, {
  id: "docs",
  component({ toc, frontmatter, default: MDX }) {
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX
            components={{
              ...defaultMdxComponents,
            }}
          />
        </DocsBody>
      </DocsPage>
    );
  },
});

export const Route = createFileRoute("/$locale/_docs/docs/$")({
  component: Page,
  loader: async ({ params }) => {
    const data = await loader({
      data: {
        slugs: params._splat?.split("/") ?? [],
        locale: params.locale,
      },
    });
    // debugger;
    await clientLoader.preload(data.path);
    return data;
  },
  head: ({ loaderData }) => {
    const { title, description } = loaderData?.page ?? {};
    return createHeadTags({
      title,
      description,
    });
  },
});

const loader = createServerFn({ method: "GET" })
  .inputValidator((params: { slugs: string[]; locale?: string }) => params)
  // .middleware([staticFunctionMiddleware])
  .handler(async ({ data: { slugs, locale } }) => {
    const page = source.getPage(slugs, locale);
    if (!page) throw notFound();
    return {
      tree: source.getPageTree(locale) as object,
      path: page.path,
      page: {
        title: page?.data.title,
        description: page?.data.description,
      },
    };
  });

function Page() {
  const data = Route.useLoaderData();
  const Content = clientLoader.getComponent(data.path);
  const tree = useMemo(
    () => transformPageTree(data.tree as PageTree.Folder),
    [data.tree],
  );
  const { locale } = Route.useParams();

  return (
    <DocsLayout {...baseOptions(locale)} tree={tree}>
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Content />
    </DocsLayout>
  );
}

function transformPageTree(tree: PageTree.Folder): PageTree.Folder {
  function transform<T extends PageTree.Item | PageTree.Separator>(item: T) {
    if (typeof item.icon !== "string") return item;

    return {
      ...item,
      icon: (
        <span
          // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
          dangerouslySetInnerHTML={{
            __html: item.icon,
          }}
        />
      ),
    };
  }

  return {
    ...tree,
    index: tree.index ? transform(tree.index) : undefined,
    children: tree.children.map((item) => {
      if (item.type === "folder") return transformPageTree(item);
      return transform(item);
    }),
  };
}
