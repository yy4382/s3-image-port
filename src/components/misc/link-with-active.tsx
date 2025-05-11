"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LinkWithActive({
  ...props
}: React.ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(props.href.toString());

  return <Link {...props} {...(isActive ? { "data-status": "active" } : {})} />;
}
