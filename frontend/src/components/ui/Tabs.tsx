"use client";

import React from "react";
import { clsx } from "clsx";

interface TabsProps {
  tabs: { key: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={clsx("flex border-b border-surface-dark-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            "relative px-4 py-3 text-sm font-medium transition-colors",
            "hover:text-gray-200",
            activeTab === tab.key
              ? "text-brand-400"
              : "text-gray-400"
          )}
        >
          <span className="flex items-center gap-2">
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-brand-400/15 text-brand-400 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {tab.count}
              </span>
            )}
          </span>
          {activeTab === tab.key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
