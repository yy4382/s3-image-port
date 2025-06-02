"use client";
import { PropsWithChildren, useEffect, useState } from "react";

export function ClientOnly({
  children,
  fallback,
}: PropsWithChildren<{ fallback?: React.ReactNode }>) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return fallback ?? null;
  }
  return children;
}
