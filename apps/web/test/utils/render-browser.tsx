import { IntlProvider } from "use-intl";
import { PropsWithChildren, useState } from "react";
import en from "@/../messages/en.json";
import { Toaster } from "sonner";
import { page } from "vitest/browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const TestProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <IntlProvider locale="en" messages={en}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster toastOptions={{ duration: 10000 }} />
      </QueryClientProvider>
    </IntlProvider>
  );
};

export function render(...args: Parameters<typeof page.render>) {
  return page.render(args[0], {
    wrapper: TestProviders,
    ...args[1],
  });
}
