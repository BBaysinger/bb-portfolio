"use client";

import React, { Suspense } from "react";
import { Provider } from "react-redux";

import { RUMInitializer } from "@/components/RUMInitializer";
import { store } from "@/store/store";

/**
 * App-wide providers.
 *
 * Notes:
 * - This file is a client component because it uses React context providers.
 * - Provider ordering matters: Redux wraps everything so any child can access the store.
 * - RUM initialization is intentionally placed near the root so it runs once per app load.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    // Make the Redux store available to the entire app subtree.
    <Provider store={store}>
      {/*
        RUM initialization may depend on client-only APIs and/or dynamic imports.
        Wrapping it in Suspense prevents blocking the initial render.
        Using `null` keeps the provider tree visually silent (no loading UI).
      */}
      <Suspense fallback={null}>
        <RUMInitializer />
      </Suspense>
      {children}
    </Provider>
  );
}
