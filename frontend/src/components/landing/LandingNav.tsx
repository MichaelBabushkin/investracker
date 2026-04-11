"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

interface LandingNavProps {
  activePage?: "home" | "pricing";
}

export default function LandingNav({ activePage }: LandingNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#0B0F1A]/90 backdrop-blur-xl border-b border-white/5">
      <div className="px-8 sm:px-12 lg:px-32">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="hover:opacity-90 transition-opacity shrink-0">
            <Image
              src="/images/investracker_logo.svg"
              alt="Investracker"
              width={160}
              height={40}
              priority
              className="h-9 w-auto"
            />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/pricing"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePage === "pricing" ? "text-teal-400" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/auth/login"
              className="text-gray-400 hover:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="ml-2 bg-teal-400 hover:bg-teal-300 text-black font-semibold px-5 py-2 rounded-lg text-sm transition-all"
            >
              Get Started Free
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-white/5"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div className={`md:hidden border-t border-white/5 bg-[#111827] overflow-hidden transition-all duration-300 ${mobileMenuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-6 py-3 space-y-1">
          <Link href="/pricing" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link href="/auth/login" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
          <Link href="/auth/register" className="block px-3 py-2.5 rounded-lg bg-teal-400 text-black font-semibold text-center" onClick={() => setMobileMenuOpen(false)}>Get Started Free</Link>
        </div>
      </div>
    </nav>
  );
}
