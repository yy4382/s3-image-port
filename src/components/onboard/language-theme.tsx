"use client";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { localeLocalNames } from "@/i18n/routing";
import { RadioGroup, RadioGroupItem } from "../animate-ui/radix/radio-group";
import { Label } from "../ui/label";
import { useTheme } from "next-themes";
import McSun from "~icons/mingcute/sun-line.jsx";
import McMoon from "~icons/mingcute/moon-line.jsx";
import McSystem from "~icons/mingcute/computer-line.jsx";
import { MotionHighlight } from "../animate-ui/effects/motion-highlight";
import { ClientOnly } from "../misc/client-only";
import { Skeleton } from "../ui/skeleton";

export function LanguageTheme() {
  return (
    <div className="flex flex-col gap-10 w-full justify-center">
      <Language />
      <Theme />
    </div>
  );
}

function Language() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Which language do you prefer?
      </h2>
      <div>
        <RadioGroup
          defaultValue={locale}
          onValueChange={handleLocaleChange}
          orientation="horizontal"
        >
          {Object.entries(localeLocalNames).map(([locale, name]) => (
            <div className="flex items-center space-x-2" key={locale}>
              <RadioGroupItem value={locale} id={locale} />
              <Label htmlFor={locale}>{name}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

function Theme() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        Which theme do you prefer?
      </h2>
      <ClientOnly fallback={<Skeleton className="h-[42px] w-68 rounded-lg" />}>
        <ThemeContent />
      </ClientOnly>
    </div>
  );
}

function ThemeContent() {
  const theme = useTheme();
  const TABS = [
    { value: "light", title: "Light", icon: <McSun className="size-4" /> },
    { value: "dark", title: "Dark", icon: <McMoon className="size-4" /> },
    { value: "system", title: "System", icon: <McSystem className="size-4" /> },
  ];
  return (
    <div className="flex border rounded-lg p-1 w-fit">
      <MotionHighlight
        defaultValue={theme.theme}
        onValueChange={(value) => {
          if (value) {
            theme.setTheme(value);
          }
        }}
        className="rounded-md"
      >
        {TABS.map((tab) => (
          <div
            key={tab.value}
            data-value={tab.value}
            data-active={tab.value === theme.theme}
            className="flex items-center gap-2 px-3 h-8 cursor-pointer"
          >
            {tab.icon}
            {tab.title}
          </div>
        ))}
      </MotionHighlight>
    </div>
  );
}
