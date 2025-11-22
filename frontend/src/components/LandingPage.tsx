"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  SparklesIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Logo from "./Logo";

const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

const DotLottiePlayer = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false }
);

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Logo size="sm" linkTo="/" />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              <Link
                href="/israeli-stocks"
                className="text-gray-600 hover:text-primary-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Demo
              </Link>
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-primary-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-primary-400 hover:bg-primary-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-primary-50"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden border-t border-gray-200 overflow-hidden transition-all duration-300 ease-in-out bg-white ${
            mobileMenuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/israeli-stocks"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Demo
            </Link>
            <Link
              href="/auth/login"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="block px-3 py-2 rounded-md text-base font-medium text-white bg-primary-400 hover:bg-primary-500 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-24 sm:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center px-4 py-1.5 mb-6 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                <SparklesIcon className="w-4 h-4 mr-2" />
                Professional Investment Tracking
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Track Your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-400">
                  Investments
                </span>
                <br />
                <span className="text-4xl md:text-6xl">Like a Pro</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed">
                Monitor your portfolio performance, analyze market trends, and
                make informed investment decisions with our comprehensive
                platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 lg:justify-start justify-center items-center">
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto bg-primary-400 hover:bg-primary-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Start Tracking Free
                </Link>
                <Link
                  href="/israeli-stocks"
                  className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-8 py-4 rounded-xl text-lg font-semibold transition-all"
                >
                  View Demo
                </Link>
              </div>
            </div>

            {/* Right side - Lottie Animation */}
            <div className="relative">
              <div className="relative z-10 flex justify-center">
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

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-accent-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to track investments
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From portfolio tracking to advanced analytics, we provide all the
              tools you need to stay on top of your investments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-14 h-14 bg-primary-400 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <ChartBarIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Portfolio Analytics
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Get detailed insights into your portfolio performance with
                advanced charts and real-time analytics.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-accent-50 to-white border border-accent-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-14 h-14 bg-accent-300 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <CurrencyDollarIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Real-time Tracking
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Monitor your investments in real-time with live market data and
                instant portfolio updates.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-14 h-14 bg-primary-400 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <ArrowTrendingUpIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Performance Metrics
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Track ROI, gains/losses, and other key performance indicators
                across all your holdings.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-accent-50 to-white border border-accent-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-14 h-14 bg-accent-300 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheckIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Secure & Private
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Your financial data is protected with bank-level security and
                end-to-end encryption.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-14 h-14 bg-primary-400 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <UserGroupIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Multi-Portfolio Support
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Manage multiple portfolios and investment accounts from a single
                unified dashboard.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-accent-50 to-white border border-accent-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-14 h-14 bg-accent-300 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Smart Insights
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Get AI-powered insights and recommendations to optimize your
                investment strategy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section with Animation */}
      <div className="bg-gradient-to-br from-primary-50 to-accent-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              {DotLottiePlayer && (
                <DotLottiePlayer
                  src="/lottie/track.lottie"
                  loop
                  autoplay
                  style={{ height: "400px", width: "400px" }}
                />
              )}
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Track Every Investment Move
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Our platform gives you complete visibility into your portfolio
                with real-time updates, detailed analytics, and actionable
                insights.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <div className="text-3xl font-bold text-primary-500 mb-2">
                    99.9%
                  </div>
                  <div className="text-gray-600">Uptime</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <div className="text-3xl font-bold text-primary-500 mb-2">
                    10k+
                  </div>
                  <div className="text-gray-600">Active Users</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <div className="text-3xl font-bold text-primary-500 mb-2">
                    $2B+
                  </div>
                  <div className="text-gray-600">Assets Tracked</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <div className="text-3xl font-bold text-primary-500 mb-2">
                    24/7
                  </div>
                  <div className="text-gray-600">Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative bg-gradient-to-br from-primary-400 via-primary-500 to-accent-400 py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to take control of your investments?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed">
                Join thousands of investors who trust Investracker to manage
                their portfolios.
              </p>
              <Link
                href="/auth/register"
                className="inline-flex items-center bg-white text-primary-600 hover:bg-gray-50 font-bold py-4 px-10 rounded-xl text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Get Started Today
                <ArrowTrendingUpIcon className="w-5 h-5 ml-2" />
              </Link>
              <p className="mt-6 text-white/80 text-sm">
                No credit card required • Free forever
              </p>
            </div>
            <div className="flex justify-center">
              {DotLottiePlayer && (
                <DotLottiePlayer
                  src="/lottie/join-us.lottie"
                  loop
                  autoplay
                  style={{ width: "100%", maxWidth: "350px", height: "auto" }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-primary-400">Invest</span>racker
              </h3>
              <p className="text-gray-400 text-sm">
                Professional investment portfolio tracking
              </p>
            </div>
            <div className="flex gap-8 text-sm">
              <Link
                href="/auth/login"
                className="text-gray-400 hover:text-primary-400 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="text-gray-400 hover:text-primary-400 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/israeli-stocks"
                className="text-gray-400 hover:text-primary-400 transition-colors"
              >
                Demo
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
            © 2025 Investracker. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
