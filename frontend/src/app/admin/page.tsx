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
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/admin");
      return;
    }

    // Redirect if not admin
    if (user && user.role?.toLowerCase() !== "admin") {
      router.push("/");
      return;
    }
  }, [user, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if not admin
  if (user.role?.toLowerCase() !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminDashboard />
    </>
  );
}
