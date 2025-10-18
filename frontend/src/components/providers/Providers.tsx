"use client";

import React from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import AuthInitializer from "@/components/AuthInitializer";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}
