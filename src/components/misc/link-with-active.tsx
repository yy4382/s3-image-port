"use client";

import { Link, usePathname } from "@/i18n/navigation";

export function LinkWithActive({
  ...props
}: React.ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(props.href.toString());

  return <Link {...props} {...(isActive ? { "data-status": "active" } : {})} />;
}
