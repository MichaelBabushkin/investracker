"use client";

import React, { useState, useEffect } from "react";
import { israeliStocksAPI } from "@/services/api";
import { AlertTriangle, FileText, Hand, CheckCircle, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface ReconcileTransaction {
  id: number;
  transaction_date: string;
  transaction_type: string;
  symbol: string;
  company_name: string;
  quantity: number;
  price: number;
  total_value: number;
  commission: number;
  currency: string;
  market: string;
}

interface ReconcilePreview {
  period_start: string;
  period_end: string;
  period_label: string;
  manual_count: number;
  pdf_count: number;
  manual_transactions: ReconcileTransaction[];
  pdf_transactions: ReconcileTransaction[];
}

interface ReconcilePeriodReviewProps {
  batchId: string;
  onAccepted: () => void;
  onCancel: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  BUY: "text-gain",
  SELL: "text-loss",
  DIVIDEND: "text-info",
  DEPOSIT: "text-warn",
  WITHDRAWAL: "text-warn",
};

const MARKET_BADGE: Record<string, string> = {
  israeli: "bg-brand-400/10 text-brand-400 border border-brand-400/20",
  world: "bg-info/10 text-info border border-info/20",
};

function TxRow({ tx, dim }: { tx: ReconcileTransaction; dim?: boolean }) {
  const typeColor = TYPE_COLORS[tx.transaction_type] ?? "text-gray-400";
  const marketClass = MARKET_BADGE[tx.market] ?? "bg-white/5 text-gray-400";

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02] ${dim ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-gray-200 truncate">{tx.company_name || tx.symbol}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColor}`}>{tx.transaction_type}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${marketClass}`}>{tx.market}</span>
        </div>
        <div className="text-[11px] text-gray-500">{tx.transaction_date}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-gray-300 tabular-nums">
          {tx.quantity != null ? `${Number(tx.quantity).toLocaleString()} units` : "—"}
        </div>
        <div className="text-[11px] text-gray-500 tabular-nums">
          {tx.total_value != null
            ? `${tx.currency} ${Number(tx.total_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
        </div>
      </div>
    </div>
  );
}

export default function ReconcilePeriodReview({ batchId, onAccepted, onCancel }: ReconcilePeriodReviewProps) {
  const [preview, setPreview] = useState<ReconcilePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await israeliStocksAPI.reconcilePreview(batchId);
        setPreview(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail ?? "Failed to load reconcile preview");
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId]);

  const handleAccept = async () => {
    if (!preview) return;
    setAccepting(true);
    try {
      const result = await israeliStocksAPI.acceptReport(batchId);
      if (result.success) {
        toast.success(
          `${preview.period_label} accepted — removed ${result.deleted_manual_count} manual entries, added ${result.approved_from_pdf} from PDF`
        );
        onAccepted();
      } else {
        toast.error("Accept failed. Check errors.");
        if (result.errors?.length) {
          console.error("Accept-report errors:", result.errors);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to accept report");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
        <Loader2 size={24} className="animate-spin" />
        <span className="text-sm">Loading reconcile preview…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle size={24} className="text-loss" />
        <p className="text-sm text-gray-400">{error}</p>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-300 underline">Cancel</button>
      </div>
    );
  }

  if (!preview) return null;

  const hasConflict = preview.manual_count > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-heading font-semibold text-gray-100">
            PDF Report — {preview.period_label}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {preview.period_start} → {preview.period_end}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          aria-label="Cancel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Summary banner */}
      {hasConflict ? (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-warn/5 border border-warn/20">
          <AlertTriangle size={16} className="text-warn shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <span className="font-medium text-warn">{preview.manual_count} manual {preview.manual_count === 1 ? "entry" : "entries"}</span>
            {" "}already exist for this period. Accepting the report will{" "}
            <span className="font-medium text-white">permanently delete</span> them and replace with{" "}
            <span className="font-medium text-gain">{preview.pdf_count} PDF entries</span>.
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gain/5 border border-gain/20">
          <CheckCircle size={16} className="text-gain shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            No manual entries for this period. Accepting will add{" "}
            <span className="font-medium text-gain">{preview.pdf_count} transactions</span> from the PDF.
          </div>
        </div>
      )}

      {/* Two-column diff */}
      <div className="grid grid-cols-2 gap-4">
        {/* Manual — to be deleted */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Hand size={13} className="text-loss" />
            <span className="text-xs font-medium text-loss uppercase tracking-wide">
              Manual ({preview.manual_count})
            </span>
            {hasConflict && (
              <span className="text-[10px] text-gray-500 ml-auto">will be deleted</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
            {preview.manual_transactions.length === 0 ? (
              <div className="text-xs text-gray-600 italic px-3 py-4 text-center">
                No manual entries for this period
              </div>
            ) : (
              preview.manual_transactions.map((tx) => (
                <TxRow key={`m-${tx.id}`} tx={tx} dim={false} />
              ))
            )}
          </div>
        </div>

        {/* PDF — to be added */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-gain" />
            <span className="text-xs font-medium text-gain uppercase tracking-wide">
              PDF ({preview.pdf_count})
            </span>
            <span className="text-[10px] text-gray-500 ml-auto">will be approved</span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
            {preview.pdf_transactions.length === 0 ? (
              <div className="text-xs text-gray-600 italic px-3 py-4 text-center">
                No transactions in PDF batch
              </div>
            ) : (
              preview.pdf_transactions.map((tx) => (
                <TxRow key={`p-${tx.id}`} tx={tx} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
        <button
          onClick={onCancel}
          disabled={accepting}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-400/10 border border-brand-400/30 text-brand-400 text-sm font-medium hover:bg-brand-400/20 transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          {accepting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Accepting…
            </>
          ) : (
            <>
              <CheckCircle size={14} />
              Accept Report for {preview.period_label}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
