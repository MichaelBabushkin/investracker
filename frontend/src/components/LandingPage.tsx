"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  FileText,
  TrendingUp,
  BarChart3,
  Calendar,
  BookOpen,
  MessageSquare,
  Globe,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import LandingNav from "./landing/LandingNav";
import LandingFaq from "./landing/LandingFaq";

const DotLottiePlayer = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false }
);

const features = [
  {
    icon: FileText,
    title: "Excellence Broker Import",
    description: "Upload your Excellence broker PDF statements and we automatically parse every transaction — buys, sells, dividends, and currency conversions.",
    accent: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  {
    icon: Globe,
    title: "Israeli & World Stocks",
    description: "Track TA-25 and TA-90 Israeli stocks alongside your US and global holdings. View everything in both ILS and USD.",
    accent: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Prices",
    description: "Live prices refreshed every 15 minutes for active holdings. Covers Tel Aviv and major world exchanges via Yahoo Finance.",
    accent: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: BarChart3,
    title: "Portfolio Analytics",
    description: "Sector allocation, realized P&L, capital gains tax (ILS), cost basis tracking, and full transaction history for every position.",
    accent: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    icon: Calendar,
    title: "Dividends & Calendar",
    description: "Full dividend history, upcoming ex-dividend dates, earnings announcements, and stock splits — all in one calendar view.",
    accent: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: MessageSquare,
    title: "Telegram Financial News",
    description: "Curated feed from leading Hebrew and English financial Telegram channels. Videos, images, and rich text — all in-app.",
    accent: "text-rose-400",
    bg: "bg-rose-400/10",
  },
];

const faqs = [
  {
    q: "Which brokers are supported for PDF import?",
    a: "Currently we support Excellence (מצוינות) broker statements. The parser automatically detects buy/sell transactions, dividends, currency conversions, and capital gains tax entries.",
  },
  {
    q: "What exchanges and markets are covered?",
    a: "Tel Aviv Stock Exchange (TA-25, TA-90) for Israeli stocks, plus US and major global exchanges for world stocks — all priced via Yahoo Finance.",
  },
  {
    q: "How often are prices updated?",
    a: "Active holdings are refreshed every 15 minutes during market hours. Historical close prices are always available even when markets are closed.",
  },
  {
    q: "Is my financial data safe?",
    a: "Your data is stored in your own private account and never shared. We do not connect to your broker directly — you import via PDF upload.",
  },
  {
    q: "Do I need to manually enter transactions?",
    a: "No. Upload your broker PDF and we parse everything automatically. You review each transaction before it's added to your portfolio.",
  },
  {
    q: "What currencies are supported?",
    a: "Both ILS (₪) and USD ($). Exchange rates are extracted from your broker statements, and the dashboard shows values in both currencies.",
  },
  {
    q: "What is the Telegram news feed?",
    a: "Subscribe to curated financial Telegram channels and read their posts — including images and videos — directly inside Investracker.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes — Investracker is free during our early access period. Full access to all features with no credit card required.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-gray-100">
      <LandingNav activePage="home" />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-teal-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-8 sm:px-12 lg:px-32 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-teal-400/10 text-teal-400 text-sm font-medium border border-teal-400/20">
                <ShieldCheck size={14} />
                Built for Israeli investors
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold mb-6 leading-[1.05]">
                Your entire<br />
                portfolio,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
                  one place
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed max-w-xl">
                Import from Excellence broker, track Israeli and world stocks in ILS & USD,
                and stay informed with curated financial news — all in one dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 lg:justify-start justify-center items-center">
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-400 hover:bg-teal-300 text-black font-semibold px-8 py-4 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-teal-400/20"
                >
                  Get Started Free
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-8 py-4 rounded-xl text-base font-medium transition-all"
                >
                  See Pricing
                </Link>
              </div>
              <div className="mt-7 flex items-center gap-5 lg:justify-start justify-center text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-teal-400" /> No credit card</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-teal-400" /> Free during early access</span>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              {DotLottiePlayer && (
                <DotLottiePlayer
                  src="/lottie/Hero.lottie"
                  loop
                  autoplay
                  style={{ width: "100%", maxWidth: "100%", height: "auto" }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-white/5 py-24">
        <div className="px-8 sm:px-12 lg:px-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">Up and running in minutes</h2>
            <p className="text-gray-400 text-lg">No manual data entry. No API keys. Just your broker PDF.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Upload your PDF", body: "Export a statement from your Excellence account and upload it. We do the rest." },
              { step: "2", title: "Review transactions", body: "Every transaction is staged for your approval before it hits your portfolio." },
              { step: "3", title: "Track & analyze", body: "Your holdings, P&L, dividends, and tax figures update automatically with live prices." },
            ].map(({ step, title, body }) => (
              <div key={step} className="relative p-8 rounded-2xl bg-[#111827] border border-white/5">
                <div className="w-10 h-10 rounded-full bg-teal-400/10 border border-teal-400/20 flex items-center justify-center text-teal-400 font-bold text-sm mb-5">
                  {step}
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Track section with track.lottie ── */}
      <section className="border-t border-white/5 py-24">
        <div className="px-8 sm:px-12 lg:px-32">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="flex justify-center">
              {DotLottiePlayer && (
                <DotLottiePlayer
                  src="/lottie/track.lottie"
                  loop
                  autoplay
                  style={{ width: "100%", maxWidth: "100%", height: "auto" }}
                />
              )}
            </div>
            <div>
              <h2 className="text-4xl font-heading font-bold mb-5">Full visibility, zero guesswork</h2>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                See your portfolio exactly as it is — cost basis, current value, realized and unrealized gains,
                capital gains tax paid, and sector exposure. All calculated from your actual transactions.
              </p>
              <div className="space-y-4">
                {[
                  "Israeli stocks (TA-25, TA-90) + World stocks side by side",
                  "ILS & USD values with per-transaction exchange rates",
                  "Capital gains tax (מס רווח הון) tracked automatically",
                  "Dividend history + upcoming payment calendar",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-teal-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="border-t border-white/5 py-24">
        <div className="px-8 sm:px-12 lg:px-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">Everything you need</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Built specifically for investors holding both Israeli and international assets.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group p-7 rounded-2xl bg-[#111827] border border-white/5 hover:border-white/10 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-5`}>
                    <Icon size={22} className={f.accent} />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2 text-white">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <LandingFaq
        items={faqs}
        title="Got questions? We have answers."
        subtitle="FAQ"
      />

      {/* ── CTA ── */}
      <section className="relative border-t border-white/5 py-24 overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400/8 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative px-8 sm:px-12 lg:px-32 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">
            Ready to see your full picture?
          </h2>
          <p className="text-lg text-gray-400 mb-10 leading-relaxed">
            Join investors who track their Excellence portfolio alongside world markets — all in one place.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-teal-400 hover:bg-teal-300 text-black font-semibold py-4 px-10 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-teal-400/20"
          >
            Start for Free
            <ArrowRight size={18} />
          </Link>
          <p className="mt-4 text-gray-500 text-sm">Free during early access · No credit card required</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="px-8 sm:px-12 lg:px-32">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-xl font-heading font-bold">
                <span className="text-teal-400">Invest</span>
                <span className="text-gray-200">racker</span>
              </h3>
              <p className="text-gray-500 text-sm mt-1">Portfolio tracking for Israeli investors</p>
            </div>
            <div className="flex gap-8 text-sm">
              <Link href="/pricing" className="text-gray-500 hover:text-teal-400 transition-colors">Pricing</Link>
              <Link href="/auth/login" className="text-gray-500 hover:text-teal-400 transition-colors">Sign In</Link>
              <Link href="/auth/register" className="text-gray-500 hover:text-teal-400 transition-colors">Get Started</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-center text-gray-600 text-sm">
            © 2026 Investracker. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
