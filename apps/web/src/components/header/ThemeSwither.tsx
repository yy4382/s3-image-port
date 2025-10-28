"use client";

import { useTheme } from "next-themes";
import McSun from "~icons/mingcute/sun-line.jsx";
import McMoon from "~icons/mingcute/moon-line.jsx";
import McSystem from "~icons/mingcute/computer-line.jsx";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useTranslations } from "use-intl";
import { MotionHighlight } from "../animate-ui/effects/motion-highlight";
import { ClientOnly } from "@tanstack/react-router";

function ThemeSwitcherContent() {
  const theme = useTheme();
  const TABS = [
    { value: "light", title: "Light", icon: <McSun className="size-4" /> },
    { value: "dark", title: "Dark", icon: <McMoon className="size-4" /> },
    { value: "system", title: "System", icon: <McSystem className="size-4" /> },
  ];
  return (
    <div className="flex border rounded-lg p-0.5 w-fit">
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
            className="size-8 grid place-items-center"
            aria-label={tab.title}
          >
            {tab.icon}
          </div>
        ))}
      </MotionHighlight>
    </div>
  );
}
function ThemeSwitcherButton() {
  const theme = useTheme();
  let icon;
  switch (theme.theme) {
    case "light":
      icon = <McSun className="size-4" />;
      break;
    case "dark":
      icon = <McMoon className="size-4" />;
      break;
    case "system":
      icon = <McSystem className="size-4" />;
      break;
    default:
      icon = <McSystem className="size-4" />;
      break;
  }
  return icon;
}

export function ThemeSwitcher() {
  const t = useTranslations("theme");
  return (
    <div>
      <ClientOnly>
        <div className="hidden md:block">
          <ThemeSwitcherContent />
        </div>
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <ThemeSwitcherButton />
                <span className="sr-only">{t("toggleTheme")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-fit bg-transparent  min-w-fit p-0">
              <ThemeSwitcherContent />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ClientOnly>
    </div>
  );
}
