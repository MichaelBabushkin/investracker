"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { marketDataAPI } from "@/services/api";
import { formatCurrency, MarketCurrency } from "@/utils/formatters";

interface Category {
  id: string;
  name: string;
}

interface IndexItem {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
}

export default function MarketTickerBar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<IndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await marketDataAPI.getCategories();
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategory(data[0]); // Default to first (usually US Markets)
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch items for selected category and setup auto-refresh
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchItems = async () => {
      if (!selectedCategory) return;
      try {
        const data = await marketDataAPI.getIndices(selectedCategory.id);
        setItems(data.items);
      } catch (err) {
        console.error("Failed to load indices:", err);
      } finally {
        setLoading(false);
      }
    };

    if (selectedCategory) {
      setLoading(true);
      fetchItems();
      intervalId = setInterval(fetchItems, 60000); // refresh every 60s
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedCategory]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.scrollTo({
        left: direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    if (selectedCategory?.id === "currencies") {
      return formatCurrency(price, "USD");
    }
    return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-surface-dark-secondary border-b border-white/5 h-11 flex items-center px-4 gap-4 overflow-hidden relative">
      {/* Category Dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1 text-sm font-medium text-white whitespace-nowrap hover:text-brand-400 transition-colors"
        >
          {selectedCategory?.name || "Loading..."}
          <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && categories.length > 0 && (
          <div className="absolute top-full left-0 mt-2 bg-surface-dark-secondary border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[150px]">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  selectedCategory?.id === cat.id
                    ? "text-brand-400 bg-brand-400/10"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable Tiles */}
      <div 
        ref={scrollContainerRef} 
        className="flex items-center gap-0 overflow-x-hidden flex-1 scrollbar-hide"
      >
        {loading ? (
          // Skeleton loading state
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center px-4 border-r border-white/10 shrink-0 opacity-50 animate-pulse">
              <div className="h-4 w-16 bg-white/20 rounded mr-2" />
              <div className="h-4 w-12 bg-white/10 rounded mr-3" />
              <div className="h-3 w-10 bg-white/10 rounded mr-1" />
              <div className="h-3 w-8 bg-white/10 rounded" />
            </div>
          ))
        ) : (
          items.map((item, i) => {
            const isPositive = item.change !== null && item.change >= 0;
            const sign = isPositive ? "+" : "";
            const colorClass = item.change === null ? "text-gray-500" : isPositive ? "text-gain" : "text-loss";

            return (
              <div key={item.symbol} className={`flex items-center px-4 shrink-0 ${i !== items.length - 1 ? 'border-r border-white/10' : ''}`}>
                <span className="font-bold text-white text-sm mr-2">{item.name}</span>
                <span className="tabular-nums text-white text-sm mr-3">
                  {formatPrice(item.price)}
                </span>
                <span className={`text-xs block ${colorClass} tabular-nums flex items-center gap-1`}>
                  <span>{item.change !== null ? `${sign}${item.change.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "-"}</span>
                  <span>({item.change_pct !== null ? `${sign}${item.change_pct.toFixed(2)}%` : "-"})</span>
                </span>
              </div>
            );
          })
        )}
        {!loading && items.length === 0 && (
          <div className="text-sm text-gray-500 px-4">No data available</div>
        )}
      </div>

      {/* Arrow scroll controls */}
      <div className="flex items-center shrink-0">
        <button
          onClick={() => handleScroll("left")}
          className="shrink-0 text-gray-500 hover:text-white p-1 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => handleScroll("right")}
          className="shrink-0 text-gray-500 hover:text-white p-1 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
