"use client";

import React from "react";
import { clsx } from "clsx";

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export function MetricCard({ label, value, subValue, icon, trend, className }: MetricCardProps) {
  const isPositive = trend ? trend.value >= 0 : true;

  return (
    <div
      className={clsx(
        "bg-surface-dark-secondary border border-surface-dark-border rounded-card p-5",
        "hover:border-surface-dark-border/80 transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-gray-400 font-medium">{label}</span>
        {icon && (
          <span className="text-gray-500">{icon}</span>
        )}
      </div>
      <div className="financial-value text-2xl font-bold text-gray-100 leading-none">
        {value}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {trend && (
          <span
            className={clsx(
              "inline-flex items-center text-xs font-semibold",
              isPositive ? "text-gain" : "text-loss"
            )}
          >
            {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}{trend.value.toFixed(2)}%
          </span>
        )}
        {subValue && (
          <span className="text-xs text-gray-500">{subValue}</span>
        )}
      </div>
    </div>
  );
}
