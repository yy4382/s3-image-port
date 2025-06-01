"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { CheckIcon, Globe } from "lucide-react";
import { localeLocalNames } from "@/i18n/routing";

export function LocaleSwitcher() {
  const [mounted, setMounted] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  // 构建语言选项列表
  const localeOptions = [
    { value: "en", label: localeLocalNames.en },
    { value: "zh", label: localeLocalNames.zh },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
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
