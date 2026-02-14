"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Shield,
  Users,
  Sparkles,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

const DotLottiePlayer = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false }
);

const features = [
  {
    icon: BarChart3,
    title: "Portfolio Analytics",
    description:
      "Detailed insights into portfolio performance with advanced charts and real-time analytics.",
  },
  {
    icon: DollarSign,
    title: "Real-time Tracking",
    description:
      "Monitor investments in real-time with live market data and instant portfolio updates.",
  },
  {
    icon: TrendingUp,
    title: "Performance Metrics",
    description:
      "Track ROI, gains/losses, and key performance indicators across all holdings.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Your financial data is protected with bank-level security and end-to-end encryption.",
  },
  {
    icon: Users,
    title: "Multi-Portfolio Support",
    description:
      "Manage multiple portfolios and investment accounts from a single unified dashboard.",
  },
  {
    icon: Sparkles,
    title: "Smart Insights",
    description:
      "AI-powered insights and recommendations to optimize your investment strategy.",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime" },
  { value: "10k+", label: "Active Users" },
  { value: "$2B+", label: "Assets Tracked" },
  { value: "24/7", label: "Support" },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-dark text-gray-100">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-surface-dark/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Image
              src="/images/investracker_logo-dark.svg"
              alt="Investracker"
              width={150}
              height={36}
              className="h-8 w-auto"
            />

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/israeli-stocks"
                className="text-gray-400 hover:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Demo
              </Link>
              <Link
                href="/auth/login"
                className="text-gray-400 hover:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-brand-400 hover:bg-brand-500 text-surface-dark font-semibold px-5 py-2 rounded-lg text-sm transition-all"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-white/5"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden border-t border-white/5 bg-surface-dark-secondary overflow-hidden transition-all duration-300 ${
            mobileMenuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 py-3 space-y-1">
            <Link href="/israeli-stocks" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Demo
            </Link>
            <Link href="/auth/login" className="block px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Sign In
            </Link>
            <Link href="/auth/register" className="block px-3 py-2.5 rounded-lg bg-brand-400 text-surface-dark font-semibold text-center transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-info/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-brand-400/10 text-brand-400 text-sm font-medium border border-brand-400/20">
                <Sparkles size={14} />
                Professional Investment Tracking
              </div>
              <h1 className="text-5xl md:text-7xl font-heading font-bold mb-6 leading-[1.1]">
                Track Your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-300">
                  Investments
                </span>
                <br />
                <span className="text-4xl md:text-6xl text-gray-300">
                  Like a Pro
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed max-w-xl lg:max-w-none">
                Monitor your portfolio performance, analyze market trends, and
                make informed investment decisions with our comprehensive
                platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 lg:justify-start justify-center items-center">
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto bg-brand-400 hover:bg-brand-500 text-surface-dark font-semibold px-8 py-3.5 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-brand-400/20"
                >
                  Start Tracking Free
                </Link>
                <Link
                  href="/israeli-stocks"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-8 py-3.5 rounded-xl text-base font-medium transition-all"
                >
                  View Demo
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Lottie animation */}
            <div className="relative flex justify-center">
              <div className="relative z-10">
                {DotLottiePlayer && (
                  <DotLottiePlayer
                    src="/lottie/Hero.lottie"
                    loop
                    autoplay
                    style={{ width: "100%", maxWidth: "500px", height: "auto" }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="relative py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              From portfolio tracking to advanced analytics — all the tools to
              stay on top of your investments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group p-6 rounded-xl bg-surface-dark-secondary/60 border border-white/5 hover:border-brand-400/20 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-lg bg-brand-400/10 flex items-center justify-center mb-4 group-hover:bg-brand-400/20 transition-colors">
                    <Icon size={20} className="text-brand-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="flex justify-center">
              {DotLottiePlayer && (
                <DotLottiePlayer
                  src="/lottie/track.lottie"
                  loop
                  autoplay
                  style={{ height: "380px", width: "380px" }}
                />
              )}
            </div>
            <div>
              <h2 className="text-4xl font-heading font-bold mb-4">
                Track Every Move
              </h2>
              <p className="text-lg text-gray-400 mb-10 leading-relaxed">
                Complete visibility into your portfolio with real-time updates,
                detailed analytics, and actionable insights.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="p-5 rounded-xl bg-surface-dark-secondary border border-white/5"
                  >
                    <div className="text-2xl font-heading font-bold text-brand-400 mb-1 financial-value">
                      {s.value}
                    </div>
                    <div className="text-sm text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative py-24 overflow-hidden border-t border-white/5">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-400/10 via-transparent to-info/5 pointer-events-none" />
        <div className="absolute inset-0 dot-grid pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">
                Ready to take control?
              </h2>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Join thousands of investors who trust Investracker to manage
                their portfolios.
              </p>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 bg-brand-400 hover:bg-brand-500 text-surface-dark font-semibold py-3.5 px-8 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-brand-400/20"
              >
                Get Started Today
                <ArrowRight size={18} />
              </Link>
              <p className="mt-4 text-gray-500 text-sm">
                No credit card required · Free forever
              </p>
            </div>
            <div className="flex justify-center">
              {DotLottiePlayer && (
                <DotLottiePlayer
                  src="/lottie/join-us.lottie"
                  loop
                  autoplay
                  style={{ width: "100%", maxWidth: "340px", height: "auto" }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-heading font-bold">
                <span className="text-brand-400">Invest</span>
                <span className="text-gray-200">racker</span>
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Professional investment portfolio tracking
              </p>
            </div>
            <div className="flex gap-8 text-sm">
              <Link href="/auth/login" className="text-gray-500 hover:text-brand-400 transition-colors">
                Sign In
              </Link>
              <Link href="/auth/register" className="text-gray-500 hover:text-brand-400 transition-colors">
                Get Started
              </Link>
              <Link href="/israeli-stocks" className="text-gray-500 hover:text-brand-400 transition-colors">
                Demo
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-center text-gray-600 text-sm">
            © 2025 Investracker. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
