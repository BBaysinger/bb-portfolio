"use client";

import React from "react";
import { Provider } from "react-redux";

import { AuthProvider } from "@/context/AuthContext";
import { store } from "@/store/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );
}
