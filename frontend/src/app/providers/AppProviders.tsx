"use client";

import React, { Suspense } from "react";
import { Provider } from "react-redux";

import { RUMInitializer } from "@/components/RUMInitializer";
import { store } from "@/store/store";

/**
 * Provider component for app-wide context
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <Suspense fallback={null}>
        <RUMInitializer />
      </Suspense>
      {children}
    </Provider>
  );
}
