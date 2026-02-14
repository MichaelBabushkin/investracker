"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/services/api";
import { parseBackendError } from "@/utils/errorHandling";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await authAPI.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });
      setSuccess("Registration successful! Redirecting to login…");
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (error: unknown) {
      setError(parseBackendError(error));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-lg bg-surface-dark-secondary border border-white/10 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/40 transition-colors";

  return (
    <div className="min-h-screen flex bg-surface-dark">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-surface-dark-secondary">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 text-center px-12">
          <Image src="/images/investracker_logo-dark.svg" alt="Investracker" width={220} height={56} className="mx-auto mb-8" />
          <h2 className="text-3xl font-heading font-bold text-gray-100 mb-3">
            Start your journey
          </h2>
          <p className="text-gray-400 text-lg max-w-sm mx-auto">
            Join thousands of investors tracking their portfolios with precision.
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

          <h1 className="text-2xl font-heading font-bold text-gray-100 mb-1">Create account</h1>
          <p className="text-sm text-gray-400 mb-8">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <ErrorDisplay error={error} />

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gain/10 border border-gain/20 text-gain text-sm">
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-1.5">
                  First name
                </label>
                <input id="first_name" name="first_name" type="text" value={formData.first_name} onChange={handleChange} className={inputClass} placeholder="John" />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Last name
                </label>
                <input id="last_name" name="last_name" type="text" value={formData.last_name} onChange={handleChange} className={inputClass} placeholder="Doe" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} className={inputClass} placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input id="password" name="password" type="password" autoComplete="new-password" required value={formData.password} onChange={handleChange} className={inputClass} placeholder="••••••••" />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm password
              </label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={formData.confirmPassword} onChange={handleChange} className={inputClass} placeholder="••••••••" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-400 hover:bg-brand-500 text-surface-dark font-semibold py-2.5 px-4 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}