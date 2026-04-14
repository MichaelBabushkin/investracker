"use client";

import React, { useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch } from "@/store";
import { loginWithGoogle, getCurrentUser } from "@/store/slices/authSlice";

interface GoogleSSOButtonProps {
  onError?: (message: string) => void;
}

export default function GoogleSSOButton({ onError }: GoogleSSOButtonProps) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      onError?.("No credential received from Google");
      return;
    }

    setLoading(true);
    try {
      const result = await dispatch(loginWithGoogle(idToken));
      if (loginWithGoogle.fulfilled.match(result)) {
        // Redirect immediately — tokens are stored, AuthInitializer will
        // load the user profile. Don't await getCurrentUser here because
        // a transient failure would incorrectly block the redirect.
        router.push("/");
        dispatch(getCurrentUser());
      } else {
        onError?.((result.payload as string) ?? "Google sign-in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={loading ? "opacity-60 pointer-events-none" : ""}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError?.("Google sign-in was cancelled or failed")}
        theme="filled_black"
        shape="rectangular"
        size="large"
        text="continue_with"
        width="368"
        logo_alignment="left"
      />
    </div>
  );
}
