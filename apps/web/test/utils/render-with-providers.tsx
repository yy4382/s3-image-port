import { NextIntlClientProvider } from "next-intl";
import { PropsWithChildren } from "react";
import en from "@/../messages/en.json";
import { render } from "@testing-library/react";
import { Toaster } from "sonner";

const TestProviders = ({ children }: PropsWithChildren) => {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
      <Toaster toastOptions={{ duration: 10000 }} />
    </NextIntlClientProvider>
  );
};

function customRender(
  ui: Parameters<typeof render>[0],
  options?: Parameters<typeof render>[1],
) {
  return render(ui, {
    wrapper: TestProviders,
    ...options,
  });
}

export { customRender as render };
