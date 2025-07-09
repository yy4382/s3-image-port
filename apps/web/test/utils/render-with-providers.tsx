import { NextIntlClientProvider } from "next-intl";
import { PropsWithChildren } from "react";
import en from "@/../messages/en.json";
import { render } from "@testing-library/react";

const TestProviders = ({ children }: PropsWithChildren) => {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
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
