/**
 * Shared formatting utilities for currency, numbers, dates, and percentages.
 * Use these instead of defining formatters inline in each component.
 */

export type MarketCurrency = "ILS" | "USD" | "EUR" | "GBP";

const LOCALE_MAP: Record<MarketCurrency, string> = {
  ILS: "he-IL",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

/**
 * Format a number as currency.
 * @param amount - The numeric value
 * @param currency - Currency code (default: "ILS")
 */
export function formatCurrency(
  amount?: number | null,
  currency: MarketCurrency = "ILS"
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    const fallback = currency === "USD" ? "$0.00" : currency === "ILS" ? "₪0.00" : "0.00";
    return fallback;
  }
  return new Intl.NumberFormat(LOCALE_MAP[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Shorthand for USD formatting */
export const formatUSD = (amount?: number | null) => formatCurrency(amount, "USD");

/** Shorthand for ILS formatting */
export const formatILS = (amount?: number | null) => formatCurrency(amount, "ILS");

/**
 * Format a number with locale-appropriate grouping (e.g. 1,234,567).
 */
export function formatNumber(num?: number | null, locale: string = "en-US"): string {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format a percentage with sign prefix.
 * @param value - The percentage value (e.g. 12.5 for 12.5%)
 * @param decimals - Number of decimal places (default: 2)
 * @param showSign - Whether to show +/- prefix (default: true)
 */
export function formatPercentage(
  value?: number | null,
  decimals: number = 2,
  showSign: boolean = true
): string {
  if (value === undefined || value === null || isNaN(value)) return "0.00%";
  const sign = showSign && value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format a date string to locale display.
 * @param dateStr - ISO date string or parseable date
 * @param locale - Display locale (default: "en-IL" for DD/MM/YYYY)
 */
export function formatDate(dateStr?: string | null, locale: string = "en-GB"): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString(locale);
}

/**
 * Format file size in human-readable form.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
