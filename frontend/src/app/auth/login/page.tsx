"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { login, getCurrentUser } from "@/store/slices/authSlice";
import { parseBackendError } from "@/utils/errorHandling";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (searchParams.get("session_expired") === "true") {
      setSessionExpired(true);
      window.history.replaceState({}, "", "/auth/login");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSessionExpired(false);

    try {
      const result = await dispatch(login({ email, password }));
      if (login.fulfilled.match(result)) {
        const userResult = await dispatch(getCurrentUser());
        if (getCurrentUser.fulfilled.match(userResult)) {
          router.push("/");
        } else {
          setError("Login successful but failed to load user data");
        }
      } else {
        setError(parseBackendError(result.payload));
      }
    } catch (error: unknown) {
      setError(parseBackendError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-dark">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-surface-dark-secondary">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 text-center px-12">
          <Image src="/images/investracker_logo-dark.svg" alt="Investracker" width={220} height={56} className="mx-auto mb-8" />
          <h2 className="text-3xl font-heading font-bold text-gray-100 mb-3">
            Welcome back
          </h2>
          <p className="text-gray-400 text-lg max-w-sm mx-auto">
            Track your portfolio, analyze performance, and make smarter investment decisions.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/images/investracker_logo-dark.svg" alt="Investracker" width={180} height={44} />
          </div>

          <h1 className="text-2xl font-heading font-bold text-gray-100 mb-1">Sign in</h1>
          <p className="text-sm text-gray-400 mb-8">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Create one
            </Link>
          </p>

          {sessionExpired && (
            <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-warn/10 border border-warn/20">
              <AlertTriangle size={18} className="text-warn mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-warn">Session Expired</p>
                <p className="text-xs text-gray-400 mt-0.5">Please sign in again to continue.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <ErrorDisplay error={error} />

            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input
                id="email-address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-dark-secondary border border-white/10 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/40 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-dark-secondary border border-white/10 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/40 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-surface-dark-secondary text-brand-400 focus:ring-brand-400/40" />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-400 hover:bg-brand-500 text-surface-dark font-semibold py-2.5 px-4 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
