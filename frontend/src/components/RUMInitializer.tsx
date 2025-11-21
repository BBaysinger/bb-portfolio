"use client";

import { useEffect } from "react";

import { initializeRUM } from "@/services/rum";

/**
 * Initializes CloudWatch RUM for visitor tracking
 * Must be a client component to access browser APIs
 */
export function RUMInitializer() {
  useEffect(() => {
    initializeRUM();
  }, []);

  return null;
}
