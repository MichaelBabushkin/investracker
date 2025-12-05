"use client";

import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { getCurrentUser, setTokens, setInitialized } from "@/store/slices/authSlice";

export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const initializeAuth = async () => {
      // Check if we have tokens in localStorage
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refreshToken");

      if (token && refreshToken) {
        // Set tokens in Redux store
        dispatch(
          setTokens({
            access_token: token,
            refresh_token: refreshToken,
          })
        );

        // Try to fetch current user data
        try {
          const result = await dispatch(getCurrentUser());
          if (!getCurrentUser.fulfilled.match(result)) {
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
          }
        } catch (error) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
        }
      } else {
        dispatch(setInitialized());
      }
    };

    initializeAuth();
  }, [dispatch]);

  return <>{children}</>;
}
