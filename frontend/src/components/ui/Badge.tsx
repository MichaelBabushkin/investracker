"use client";

import React from "react";
import { clsx } from "clsx";

type BadgeVariant = "gain" | "loss" | "warn" | "info" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  gain: "bg-gain/15 text-gain border-gain/20",
  loss: "bg-loss/15 text-loss border-loss/20",
  warn: "bg-warn/15 text-warn border-warn/20",
  info: "bg-info/15 text-info border-info/20",
  neutral: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

export function Badge({ variant = "neutral", children, className, dot }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={clsx(
          "w-1.5 h-1.5 rounded-full",
          variant === "gain" && "bg-gain",
          variant === "loss" && "bg-loss",
          variant === "warn" && "bg-warn",
          variant === "info" && "bg-info",
          variant === "neutral" && "bg-gray-400",
        )} />
      )}
      {children}
    </span>
  );
}

interface ChangeBadgeProps {
  value: number;
  suffix?: string;
  className?: string;
}

export function ChangeBadge({ value, suffix = "%", className }: ChangeBadgeProps) {
  const isPositive = value >= 0;
  return (
    <Badge variant={isPositive ? "gain" : "loss"} className={className}>
      {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}{value.toFixed(2)}{suffix}
    </Badge>
  );
}
