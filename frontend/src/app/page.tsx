"use client";

import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";

export default function HomePage() {
  const { isAuthenticated, user, isInitialized } = useSelector(
    (state: RootState) => state.auth
  );

  // Show loading state while auth is initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-400/20 border-t-brand-400 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Show dashboard for authenticated users, landing page for others
  if (isAuthenticated && user) {
    return <Dashboard />;
  }

  return <LandingPage />;
}
