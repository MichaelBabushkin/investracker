"use client";

import React from "react";
import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx("skeleton", className)} />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={clsx("bg-surface-dark-secondary border border-surface-dark-border rounded-card p-5 space-y-4", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, className }: { rows?: number } & SkeletonProps) {
  return (
    <div className={clsx("space-y-3", className)}>
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: SkeletonProps) {
  return (
    <div className={clsx("bg-surface-dark-secondary border border-surface-dark-border rounded-card p-5", className)}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
