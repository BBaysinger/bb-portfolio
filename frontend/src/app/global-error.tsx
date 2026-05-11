"use client";

import { useEffect } from "react";

import { ErrorSurface } from "./ErrorSurface";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorSurface onRetry={reset} showDocumentShell />;
}
