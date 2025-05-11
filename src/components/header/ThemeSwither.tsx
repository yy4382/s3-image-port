"use client";

import { useTheme } from "next-themes";
import McSun from "~icons/mingcute/sun-line.jsx";
import McMoon from "~icons/mingcute/moon-line.jsx";
import McSystem from "~icons/mingcute/computer-line.jsx";
import { Button } from "../ui/button";
import { useState } from "react";
import { useEffect } from "react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]">
      <button
        className="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent p-1 size-7 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        data-state={theme.theme === "light" ? "active" : ""}
        onClick={() => theme.setTheme("light")}
      >
        <McSun className="size-4" />
      </button>
      <button
        className="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent p-1 size-7 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        data-state={theme.theme === "dark" ? "active" : ""}
        onClick={() => theme.setTheme("dark")}
      >
        <McMoon className="size-4" />
      </button>
      <button
        className="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent p-1 size-7 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        data-state={theme.theme === "system" ? "active" : ""}
        onClick={() => theme.setTheme("system")}
      >
        <McSystem className="size-4" />
      </button>
    </div>
  );
}
export function ThemeSwitcherButton() {
  const [mounted, setMounted] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

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
  return (
    <Button size="icon" variant={"ghost"}>
      {icon}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
