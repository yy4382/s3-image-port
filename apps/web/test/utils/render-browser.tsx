import { IntlProvider } from "use-intl";
import { PropsWithChildren } from "react";
import en from "@/../messages/en.json";
import { Toaster } from "sonner";
import { page } from "vitest/browser";

export const TestProviders = ({ children }: PropsWithChildren) => {
  return (
    <IntlProvider locale="en" messages={en}>
      {children}
      <Toaster toastOptions={{ duration: 10000 }} />
    </IntlProvider>
  );
};

export function render(...args: Parameters<typeof page.render>) {
  return page.render(args[0], {
    wrapper: TestProviders,
    ...args[1],
  });
}
