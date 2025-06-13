import { getLocale, LocaleNotFoundError } from "@/i18n/routing";
import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { IntlProvider } from "use-intl";

export const Route = createFileRoute("/$locale")({
  loader: (ctx) => {
    return getLocale(ctx.params.locale).catch((error) => {
      if (error instanceof LocaleNotFoundError) {
        throw notFound();
      }
      throw new Error("Unknown error");
    });
  },
  component: RouteComponent,
  notFoundComponent: NotFoundComponent,
});

function RouteComponent() {
  const { locale, messages } = Route.useLoaderData();
  return (
    <IntlProvider locale={locale} messages={messages}>
      <Outlet />
    </IntlProvider>
  );
}

function NotFoundComponent() {
  // TODO: Add a nice not found component
  return <div>Not Found</div>;
}
