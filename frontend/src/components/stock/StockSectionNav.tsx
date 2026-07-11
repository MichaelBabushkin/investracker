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
    <nav className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 bg-surface-dark/85 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => jump(item.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              active === item.id
                ? "bg-brand-400/10 text-brand-400"
                : "text-gray-500 hover:text-gray-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
