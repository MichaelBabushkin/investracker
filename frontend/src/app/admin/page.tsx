"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import AdminDashboard from "@/components/AdminDashboard";

// Ensure this route is always treated as dynamic (no static optimization)
export const dynamic = "force-dynamic";

export default function AdminPage() {
  const router = useRouter();
  const { user, isInitialized } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Wait for auth initialization to complete
    if (!isInitialized) {
      return;
    }

    // If no user or user is not admin, redirect to home
    if (!user || user.role?.toLowerCase() !== "admin") {
      router.push("/");
      return;
    }
  }, [user, isInitialized, router]);

  // Show loading state while auth is initializing
  if (!isInitialized || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not admin, this will never render because useEffect will redirect
  if (user.role?.toLowerCase() !== "admin") {
    return null;
  }

  return (
    <>
      <AdminDashboard />
    </>
  );
}
