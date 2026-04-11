"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

function FaqRow({ q, a }: FaqItem) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-xl border transition-colors duration-200 overflow-hidden ${open ? "bg-[#131c2e] border-teal-400/20" : "bg-[#111827] border-white/5 hover:border-white/10"
        }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left"
      >
        <span className={`font-medium text-[15px] transition-colors ${open ? "text-white" : "text-gray-200"}`}>
          {q}
        </span>
        <div className={`shrink-0 ml-4 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${open ? "bg-teal-400/15 text-teal-400 rotate-180" : "bg-white/5 text-gray-500"
          }`}>
          <ChevronDown size={15} />
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-64" : "max-h-0"}`}>
        <p className="px-6 pb-6 text-sm text-gray-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

interface LandingFaqProps {
  items: FaqItem[];
  title?: string;
  subtitle?: string;
}

export default function LandingFaq({
  items,
  title = "Common questions",
  subtitle = "Everything you need to know before getting started.",
}: LandingFaqProps) {
  return (
    <section className="py-24 border-t border-white/5">
      <div className="px-8 sm:px-12 lg:px-32">
        <div className=" mx-auto mb-12">
          <div className="text-[11px] font-bold tracking-widest text-teal-400 uppercase mb-4">{subtitle}</div>
          <h2 className="text-4xl md:text-5xl font-heading font-bold leading-tight">
            {title}
          </h2>
        </div>
        <div className="mx-auto space-y-3">
          {items.map((item) => (
            <FaqRow key={item.q} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
