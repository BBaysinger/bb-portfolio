"use client";

import { useEffect } from "react";

import { ErrorSurface } from "./ErrorSurface";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorSurface onRetry={reset} />;
}
