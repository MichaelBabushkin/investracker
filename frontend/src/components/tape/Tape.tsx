"use client";

/**
 * Tape — information-design primitives.
 *
 * A ledger is one continuous surface of aligned figures, not a collection of
 * cards. These primitives express hierarchy through type, alignment and two
 * rule weights — never through a fill, a shadow, or (except in three sanctioned
 * places) colour. Everything here survives an accent swap and a light-theme
 * polarity flip because structure carries the meaning.
 *
 * Colour budget (spend it ~3× per screen, no more):
 *   1. the one headline P&L figure,
 *   2. a value that breached a rule (drawdown, RSI, fees-vs-profit),
 *   3. a BUY/SELL glyph in a table.
 * Everything else is ink: `text-figure` for numbers, `text-label` for labels.
 */

import React from "react";
import { clsx } from "clsx";

/** A page section: a heavy top rule, an uppercase eyebrow, optional right-aligned meta. */
export function TapeSection({
  label,
  meta,
  children,
  className,
  first = false,
}: {
  label: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** The first section on a page omits the top rule so it doesn't double the header divider. */
  first?: boolean;
}) {
  return (
    <section className={clsx(!first && "border-t-2 border-rule-section", "pt-3", className)}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <h2 className="tape-label">{label}</h2>
        {meta != null && <span className="text-[11px] text-label tabular-nums">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * A statement row: label on the left, figure(s) right-aligned, a single row
 * hairline. One value = one row; the whole page's figures align down a column.
 */
export function StatRow({
  label,
  children,
  className,
  onClick,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Tag: any = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        "w-full flex items-baseline justify-between gap-4 h-8 border-b border-rule-row text-left",
        onClick && "hover:bg-white/[0.02] transition-colors",
        className
      )}
    >
      <span className="text-[13px] text-label truncate">{label}</span>
      <span className="flex items-baseline gap-2 shrink-0">{children}</span>
    </Tag>
  );
}

type Tone = "ink" | "gain" | "loss" | "warn";

const TONE: Record<Tone, string> = {
  ink: "text-figure",
  gain: "text-gain",
  loss: "text-loss",
  warn: "text-warn",
};

/** A figure. Defaults to ink; colour is opt-in and rationed. */
export function Fig({
  children,
  tone = "ink",
  size = "sm",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
}) {
  const sz =
    size === "hero" ? "text-[32px] leading-none font-bold"
    : size === "lg" ? "text-[22px] leading-tight font-semibold"
    : size === "md" ? "text-[15px] font-semibold"
    : "text-[13px] font-medium";
  return <span className={clsx("tape-fig", sz, TONE[tone], className)}>{children}</span>;
}

/** A quiet secondary annotation that sits after a figure (native currency, count, date). */
export function Sub({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={clsx("text-[11px] text-label tabular-nums", className)}>{children}</span>;
}

/**
 * One "argument": an uppercase eyebrow, a single tinted hero figure, then a
 * column of statement rows. Used for the four-way (growth/risk/discipline/cost)
 * grouping of the all-time KPIs.
 */
export function TapeColumn({
  label,
  hero,
  heroTone = "ink",
  heroSub,
  children,
}: {
  label: React.ReactNode;
  hero: React.ReactNode;
  heroTone?: Tone;
  heroSub?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="tape-label mb-1.5">{label}</div>
      <div className="mb-2">
        <Fig size="lg" tone={heroTone}>{hero}</Fig>
        {heroSub && <div className="mt-0.5"><Sub>{heroSub}</Sub></div>}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
