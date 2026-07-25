"use client";

import { useEffect, useState } from "react";

export interface StockNavItem {
  id: string;
  label: string;
}

/**
 * Sticky mini-nav for the stock page: scroll-jumps to sections without
 * hiding anything behind tabs. Highlights the section currently in view.
 */
export default function StockSectionNav({ items }: { items: StockNavItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the top-most visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 bg-surface-dark/85 backdrop-blur-md border-b border-rule-section">
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => jump(item.id)}
            className={`relative py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
              active === item.id ? "text-brand-400" : "text-label hover:text-figure"
            }`}
          >
            {item.label}
            {active === item.id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand-400" />}
          </button>
        ))}
      </div>
    </nav>
  );
}
