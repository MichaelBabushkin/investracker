"use client";

// Temporary A/B/C switcher for comparing the three design directions on the
// live Analytics page. Remove once a direction is chosen.

import Link from "next/link";
import { usePathname } from "next/navigation";

const VARIANTS = [
  { href: "/analytics", label: "Tape", hint: "rule-and-table" },
  { href: "/analytics-panes", label: "Panes", hint: "workspace" },
  { href: "/analytics-broadsheet", label: "Broadsheet", hint: "editorial" },
];

export default function VersionSwitch({ dark = true }: { dark?: boolean }) {
  const pathname = usePathname();
  return (
    <div className={`inline-flex items-center gap-1 rounded-full p-0.5 text-[11px] font-medium ${dark ? "bg-white/5 border border-white/10" : "bg-black/5 border border-black/10"}`}>
      {VARIANTS.map((v) => {
        const active = pathname === v.href;
        return (
          <Link key={v.href} href={v.href}
            className={`px-2.5 py-1 rounded-full transition-colors ${
              active
                ? (dark ? "bg-brand-400/20 text-brand-400" : "bg-black text-white")
                : (dark ? "text-gray-400 hover:text-gray-200" : "text-black/50 hover:text-black")
            }`}
            title={v.hint}
          >
            {v.label}
          </Link>
        );
      })}
    </div>
  );
}
