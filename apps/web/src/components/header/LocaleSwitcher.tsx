"use client";

import { ClientOnly, useNavigate } from "@tanstack/react-router";
import { CheckIcon, Globe } from "lucide-react";
import { useLocale } from "use-intl";
import { localeLocalNames } from "@/i18n/routing";
import { persistLocale } from "@/lib/locale";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

function LocaleSwitcherWrapper() {
  return (
    <ClientOnly>
      <LocaleSwitcher />
    </ClientOnly>
  );
}
export { LocaleSwitcherWrapper as LocaleSwitcher };

function LocaleSwitcher() {
  const locale = useLocale();
  const navigate = useNavigate();

  const handleLocaleChange = (newLocale: string) => {
    persistLocale(newLocale);
    navigate({
      to: ".",
      reloadDocument: true,
      params: { locale: newLocale },
    });
  };

  // 构建语言选项列表
  const localeOptions = [
    { value: "en", label: localeLocalNames.en },
    { value: "zh", label: localeLocalNames.zh },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="md:w-auto md:rounded-md md:gap-1.5 md:px-3 size-9 gap-1 font-normal"
          >
            <Globe className="md:hidden size-4" aria-hidden="true" />
            <span className="hidden md:inline">
              {locale === "zh" ? "中文" : "English"}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3 opacity-50 hidden md:inline"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-32">
        {localeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className="flex items-center justify-between cursor-pointer"
            onClick={() => handleLocaleChange(option.value)}
          >
            {option.label}
            {locale === option.value && (
              <CheckIcon className="ml-2 size-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
