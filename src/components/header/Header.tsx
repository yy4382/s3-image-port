import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";
import McGithub from "~icons/mingcute/github-line";
import { ThemeSwitcher, ThemeSwitcherButton } from "./ThemeSwither";
import { DropdownMenu, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import McUpload from "~icons/mingcute/upload-3-fill";
import McPhotoAlbum from "~icons/mingcute/photo-album-2-fill";
import McSettings from "~icons/mingcute/settings-3-fill";

// Placeholder hooks and components - replace with actual implementations
// You'll need libraries for color mode, breakpoints, and UI components (like Popover, Button, Icon)

const Header: React.FC = () => {
  const getNavLinkClass = `flex flex-row items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 [&.active]:text-primary`;

  return (
    <div className="w-full">
      <nav
        className="flex items-center justify-between h-16 gap-2 w-full"
        role="banner"
      >
        <Link
          className="flex-1 justify-start flex items-center gap-2 select-none"
          to="/"
          aria-label="Logo" // Removed i18n
        >
          <img
            src="/favicon.svg" // Assuming favicon is in public root
            className="h-6 pointer-events-none"
            alt="favicon"
            aria-hidden="true"
          />
          <span className="text-xl font-bold hidden md:block">
            S3 Image Port
          </span>
        </Link>

        <div className="flex space-x-4 font-semibold flex-1 justify-center">
          <Link to="/upload" className={getNavLinkClass}>
            <McPhotoAlbum className="text-2xl md:text-base" />
            <span className="hidden md:block">Upload</span>
          </Link>
          <Link to="/gallery" className={getNavLinkClass}>
            <McUpload className="text-2xl md:text-base" />
            <span className="hidden md:block">Photos</span>
          </Link>
          <Link to="/settings" className={getNavLinkClass}>
            <McSettings className="text-2xl md:text-base" />
            <span className="hidden md:block">Settings</span>{" "}
          </Link>
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
