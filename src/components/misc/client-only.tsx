"use client";
import { HTMLAttributes, PropsWithChildren, useEffect, useState } from "react";

export function ClientOnly({
  children,
  fallback,
  ...delegated
}: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { fallback?: React.ReactNode }>) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return fallback ?? null;
  }
  return <div {...delegated}>{children}</div>;
}
