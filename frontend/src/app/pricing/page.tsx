"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFaq from "@/components/landing/LandingFaq";

const allFeatures = [
  "Excellence broker PDF import",
  "Israeli (TA) & World stocks",
  "Real-time prices (15-min refresh)",
  "Portfolio analytics & sector allocation",
  "Realized P&L & capital gains (ILS)",
  "Dividend history & calendar",
  "Earnings & splits calendar",
  "Telegram financial news feed",
  "Education center",
  "Transaction review & approval flow",
];

const faqs = [
  {
    q: "Is Investracker really free?",
    a: "Yes. We're in early access and everything is free while we build and improve. When paid plans launch, early access users will get a significant discount.",
  },
  {
    q: "Do I need to give Investracker access to my broker account?",
    a: "No. You export a PDF statement from Excellence and upload it. We never connect directly to your broker and never see your login credentials.",
  },
  {
    q: "What happens to my data when I import a PDF?",
    a: "Transactions are parsed and staged for your review before being added to your portfolio. You approve or reject each transaction — nothing is added automatically.",
  },
  {
    q: "Can I track both TA stocks and US stocks?",
    a: "Yes. Investracker tracks Israeli stocks (TA-25, TA-90, and more) and world stocks (US markets and other exchanges) in one unified portfolio view.",
  },
  {
    q: "How accurate are the prices?",
    a: "Prices are fetched from Yahoo Finance every 15 minutes for active holdings. After market hours, the last closing price is shown. Tel Aviv Exchange and major world exchanges are all covered.",
  },
  {
    q: "Is the Telegram news feed included?",
    a: "Yes. You can subscribe to Hebrew and English financial channels and read their posts — text, images, and videos — directly inside Investracker.",
  },
  {
    q: "Will there be a paid plan in the future?",
    a: "We plan to introduce a Pro plan for power users with features like advanced tax reports, more broker integrations, and priority support. The free tier will stay free for core features.",
  },
  {
    q: "What brokers will be supported next?",
    a: "Excellence is the first integration. We're evaluating Meitav, IBI, and other Israeli brokers for future support.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-gray-100">
      <LandingNav activePage="pricing" />

      {/* Header */}
      <section className="relative overflow-hidden pt-20 pb-16 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-teal-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-8 sm:px-12 lg:px-32">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-teal-400/10 text-teal-400 text-sm font-medium border border-teal-400/20">
            Early Access
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-gray-400">
            Investracker is free during early access. No credit card, no catch.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-8 sm:px-12 lg:px-32 pb-24">
        <div className="grid md:grid-cols-2 gap-6 items-start max-w-4xl mx-auto">

          {/* Free / Early Access */}
          <div className="relative rounded-2xl bg-[#111827] border-2 border-teal-400/50 p-8 shadow-xl shadow-teal-400/5">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-teal-400 text-black text-xs font-bold px-4 py-1 rounded-full">CURRENT PLAN</span>
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Early Access</h2>
              <p className="text-sm text-gray-400">Full access while we're in beta</p>
            </div>
            <div className="mb-8">
              <span className="text-5xl font-bold text-white">Free</span>
              <span className="text-gray-500 ml-2 text-sm">forever for early users</span>
            </div>
            <Link
              href="/auth/register"
              className="flex items-center justify-center gap-2 w-full bg-teal-400 hover:bg-teal-300 text-black font-semibold py-3 rounded-xl text-sm transition-all mb-8"
            >
              Get Started Free <ArrowRight size={15} />
            </Link>
            <div className="space-y-3">
              {allFeatures.map((label) => (
                <div key={label} className="flex items-start gap-3">
                  <CheckCircle2 size={15} className="text-teal-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro — coming soon */}
          <div className="rounded-2xl bg-[#111827] border border-white/5 p-8 opacity-60">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Pro</h2>
              <p className="text-sm text-gray-400">For serious investors — coming soon</p>
            </div>
            <div className="mb-8">
              <span className="text-5xl font-bold text-gray-500">TBD</span>
            </div>
            <div className="flex items-center justify-center w-full border border-white/10 text-gray-500 font-semibold py-3 rounded-xl text-sm mb-8 cursor-not-allowed">
              Coming Soon
            </div>
            <div className="space-y-3">
              {[
                "Everything in Early Access",
                "Advanced tax reports (PDF export)",
                "Multiple broker imports",
                "More broker integrations (Meitav, IBI…)",
                "Priority support",
                "Portfolio sharing",
              ].map((label) => (
                <div key={label} className="flex items-start gap-3">
                  <CheckCircle2 size={15} className="text-gray-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-10">
          Early access users will receive a discounted rate when Pro launches. No surprise charges — ever.
        </p>
      </section>

      {/* FAQ */}
      <LandingFaq
        items={faqs}
        title="Everything you need to know"
        subtitle="FAQ"
      />

      {/* CTA */}
      <section className="relative py-20 border-t border-white/5 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-400/5 to-transparent pointer-events-none" />
        <div className="relative px-8 sm:px-12 lg:px-32 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Start tracking today</h2>
          <p className="text-gray-400 mb-8">Free during early access. No credit card required.</p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-teal-400 hover:bg-teal-300 text-black font-semibold py-4 px-10 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-teal-400/20"
          >
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="px-8 sm:px-12 lg:px-32 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-heading font-bold">
              <span className="text-teal-400">Invest</span>
              <span className="text-gray-200">racker</span>
            </h3>
            <p className="text-gray-500 text-sm mt-1">Portfolio tracking for Israeli investors</p>
          </div>
          <div className="flex gap-8 text-sm">
            <Link href="/" className="text-gray-500 hover:text-teal-400 transition-colors">Home</Link>
            <Link href="/auth/login" className="text-gray-500 hover:text-teal-400 transition-colors">Sign In</Link>
            <Link href="/auth/register" className="text-gray-500 hover:text-teal-400 transition-colors">Get Started</Link>
          </div>
        </div>
        <div className="mt-8 text-center text-gray-600 text-sm">© 2026 Investracker. All rights reserved.</div>
      </footer>
    </div>
  );
}
