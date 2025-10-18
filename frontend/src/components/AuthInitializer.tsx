"use client";

import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { getCurrentUser, setTokens } from "@/store/slices/authSlice";

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
        console.log("Found existing tokens, initializing auth...");

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
          if (getCurrentUser.fulfilled.match(result)) {
            console.log(
              "Auth initialized successfully with user:",
              result.payload
            );
          } else {
            console.log("Failed to fetch user data, clearing tokens");
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
          }
        } catch (error) {
          console.error("Error initializing auth:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
        }
      } else {
        console.log("No existing tokens found");
      }
    };

    initializeAuth();
  }, [dispatch]);

  return <>{children}</>;
}
