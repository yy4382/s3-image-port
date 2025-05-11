import Link from "next/link";
import { buttonVariants } from "../ui/button";
import McGithub from "~icons/mingcute/github-line";
import { ThemeSwitcher, ThemeSwitcherButton } from "./ThemeSwither";
import { DropdownMenu, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import McUpload from "~icons/mingcute/upload-3-fill";
import McPhotoAlbum from "~icons/mingcute/photo-album-2-fill";
import McSettings from "~icons/mingcute/settings-3-fill";
import { LinkWithActive } from "../misc/link-with-active";

// Placeholder hooks and components - replace with actual implementations
// You'll need libraries for color mode, breakpoints, and UI components (like Popover, Button, Icon)

const Header: React.FC = () => {
  const getNavLinkClass = `flex flex-row items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 data-[status=active]:text-primary`;

  return (
    <div className="w-full">
      <nav
        className="flex items-center justify-between h-16 gap-2 w-full"
        role="banner"
      >
        <Link
          className="flex-1 justify-start flex items-center gap-2 select-none"
          href="/"
          aria-label="Logo" // Removed i18n
        >
          <img
            src="/favicon.svg" // Assuming favicon is in public root
            className="pointer-events-none"
            alt="favicon"
            aria-hidden="true"
            width={24}
            height={24}
          />
          <span className="text-xl font-bold hidden md:block">
            S3 Image Port
          </span>
        </Link>

        <div className="flex space-x-4 font-semibold flex-1 justify-center">
          <LinkWithActive href="/upload" className={getNavLinkClass}>
            <McPhotoAlbum className="text-2xl md:text-base" />
            <span className="hidden md:block">Upload</span>
          </LinkWithActive>
          <LinkWithActive href="/gallery" className={getNavLinkClass}>
            <McUpload className="text-2xl md:text-base" />
            <span className="hidden md:block">Photos</span>
          </LinkWithActive>
          <LinkWithActive href="/settings" className={getNavLinkClass}>
            <McSettings className="text-2xl md:text-base" />
            <span className="hidden md:block">Settings</span>{" "}
          </LinkWithActive>
        </div>

        <div className="flex-1 flex justify-end items-center gap-1">
          <div className="hidden md:block">
            <ThemeSwitcher />
          </div>
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ThemeSwitcherButton />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <ThemeSwitcher />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Removed Language Switcher Popover */}

          <a
            target="_blank"
            href="https://github.com/yy4382/s3-image-port"
            className={buttonVariants({ size: "icon", variant: "ghost" })}
            aria-label="GitHub Repository"
          >
            <McGithub />
          </a>
        </div>
      </nav>
    </div>
  );
};

export default Header;
