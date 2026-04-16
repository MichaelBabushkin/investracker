"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Upload, Clock, Landmark, Globe2, Building2, ArrowRight, DollarSign, X, Plus } from "lucide-react";
import WorldStockHoldings from "./WorldStockHoldings";
import WorldStockTransactions from "./WorldStockTransactions";
import WorldStockDividends from "./WorldStockDividends";
import IsraeliStockHoldings from "./IsraeliStockHoldings";
import IsraeliStockTransactions from "./IsraeliStockTransactions";
import IsraeliStockDividends from "./IsraeliStockDividends";
import BrokerUploader from "./BrokerUploader";
import PendingTransactionsReview from "./PendingTransactionsReview";
import WorldPendingTransactionsReview from "./WorldPendingTransactionsReview";
import { israeliStocksAPI, worldStocksAPI } from "@/services/api";
import { WorldStockAccount } from "@/types/world-stocks";
import { UploadResult } from "@/types/israeli-stocks";
import toast from "react-hot-toast";

type Market = "israeli" | "international";
type Tab = "holdings" | "transactions" | "dividends";

const MARKET_TABS: Array<{ id: Market; name: string; icon: React.ElementType }> = [
  { id: "israeli", name: "Israeli Stocks", icon: Landmark },
  { id: "international", name: "International", icon: Globe2 },
];

const CONTENT_TABS: Array<{ id: Tab; name: string; icon: React.ElementType }> = [
  { id: "holdings", name: "Holdings", icon: Building2 },
  { id: "transactions", name: "Transactions", icon: ArrowRight },
  { id: "dividends", name: "Dividends", icon: DollarSign },
];

const TRANSACTION_TYPES = ["BUY", "SELL", "DIVIDEND", "DEPOSIT", "WITHDRAWAL"];

interface ManualForm {
  market: Market;
  transaction_type: string;
  symbol: string;
  company_name: string;
  transaction_date: string;
  quantity: string;
  price: string;
  total_value: string;
  commission: string;
  currency: string;
}

const emptyManualForm = (): ManualForm => ({
  market: "israeli",
  transaction_type: "BUY",
  symbol: "",
  company_name: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  quantity: "",
  price: "",
  total_value: "",
  commission: "",
  currency: "ILS",
});

export default function PortfolioDashboard() {
  const [market, setMarket] = useState<Market>("israeli");
  const [tab, setTab] = useState<Tab>("holdings");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Pending state
  const [israeliPendingCount, setIsraeliPendingCount] = useState(0);
  const [worldPendingCount, setWorldPendingCount] = useState(0);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingMarket, setPendingMarket] = useState<Market>("israeli");

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);

  // Manual entry state
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualForm>(emptyManualForm());
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // World accounts (for International account selector)
  const [accounts, setAccounts] = useState<WorldStockAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();

  const totalPending = israeliPendingCount + worldPendingCount;

  const fetchPendingCounts = useCallback(async () => {
    try {
      const data = await israeliStocksAPI.getPendingTransactions(undefined, undefined);
      const count = (data.transactions || []).filter(
        (t: any) => t.status === "pending" || t.status === "modified"
      ).length;
      setIsraeliPendingCount(count);
    } catch { /* silent */ }
    try {
      const data = await worldStocksAPI.getPendingTransactions(undefined, undefined);
      const count = (data.transactions || []).filter(
        (t: any) => t.status === "pending" || t.status === "modified"
      ).length;
      setWorldPendingCount(count);
    } catch { /* silent */ }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await worldStocksAPI.getAccounts();
      setAccounts(data);
      if (!selectedAccountId && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch { /* silent */ }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchPendingCounts();
    fetchAccounts();
  }, [fetchPendingCounts, fetchAccounts, refreshTrigger]);

  const handleUploadComplete = (_results: UploadResult[]) => {
    setUploadOpen(false);
    fetchPendingCounts().then(() => {
      if (israeliPendingCount > 0 || worldPendingCount > 0) {
        setPendingMarket(israeliPendingCount > 0 ? "israeli" : "international");
        setPendingOpen(true);
      }
    });
    setRefreshTrigger((t) => t + 1);
  };

  const handleApprovalComplete = () => {
    fetchPendingCounts();
    setRefreshTrigger((t) => t + 1);
  };

  const openPending = () => {
    setPendingMarket(israeliPendingCount > 0 ? "israeli" : "international");
    setPendingOpen(true);
  };

  // ── Manual entry ──────────────────────────────────────────────────────────
  const handleManualField = (field: keyof ManualForm, value: string) => {
    setManualForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-compute total_value when qty + price both filled
      if ((field === "quantity" || field === "price") && next.quantity && next.price) {
        const qty = parseFloat(next.quantity);
        const prc = parseFloat(next.price);
        if (!isNaN(qty) && !isNaN(prc)) {
          next.total_value = (qty * prc).toFixed(2);
        }
      }
      return next;
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.symbol.trim()) {
      toast.error("Symbol is required");
      return;
    }
    if (!manualForm.transaction_date) {
      toast.error("Date is required");
      return;
    }

    setManualSubmitting(true);
    try {
      if (manualForm.market === "israeli") {
        await israeliStocksAPI.createTransaction({
          symbol: manualForm.symbol.trim().toUpperCase(),
          company_name: manualForm.company_name.trim(),
          transaction_type: manualForm.transaction_type,
          transaction_date: manualForm.transaction_date,
          quantity: parseFloat(manualForm.quantity) || 0,
          price: parseFloat(manualForm.price) || 0,
          total_value: parseFloat(manualForm.total_value) || 0,
          commission: parseFloat(manualForm.commission) || 0,
          currency: manualForm.currency,
        });
        toast.success("Transaction added successfully");
        setManualOpen(false);
        setManualForm(emptyManualForm());
        setRefreshTrigger((t) => t + 1);
      } else {
        toast.error("Manual entry for International stocks is coming soon");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add transaction");
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark px-4 py-6 lg:px-8 lg:py-8">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-100">Portfolio</h1>
        <div className="flex items-center gap-2">
          {/* Pending review button */}
          <button
            onClick={openPending}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-surface-dark-secondary hover:border-warn/40 hover:bg-warn/5 transition-all text-sm font-medium text-gray-400 hover:text-warn"
          >
            <Clock size={15} />
            <span className="hidden sm:inline">Review</span>
            {totalPending > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-warn text-[#0B0F1A] text-[10px] font-bold flex items-center justify-center px-1">
                {totalPending}
              </span>
            )}
          </button>

          {/* Add manually button */}
          <button
            onClick={() => setManualOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-surface-dark-secondary hover:border-brand-400/30 hover:bg-brand-400/5 transition-all text-sm font-medium text-gray-400 hover:text-brand-400"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add</span>
          </button>

          {/* Upload button */}
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-400/30 bg-brand-400/10 hover:bg-brand-400/15 transition-all text-sm font-medium text-brand-400"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {/* ── Market switcher ───────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface-dark-secondary rounded-xl border border-white/5 w-fit mb-0">
        {MARKET_TABS.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMarket(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              market === id
                ? "bg-brand-400/10 text-brand-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={15} />
            {name}
          </button>
        ))}
      </div>

      {/* ── Content tabs + account selector ─────────────────── */}
      <div className="mt-4 flex items-center justify-between border-b border-white/8 mb-6">
        <nav className="flex gap-1">
          {CONTENT_TABS.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
                tab === id
                  ? "border-brand-400 text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20"
              }`}
            >
              <Icon size={14} />
              {name}
            </button>
          ))}
        </nav>

        {/* Account selector — International only */}
        {market === "international" && accounts.length > 0 && (
          <select
            value={selectedAccountId || ""}
            onChange={(e) =>
              setSelectedAccountId(e.target.value ? Number(e.target.value) : undefined)
            }
            className="mb-1 px-3 py-1.5 border border-white/10 rounded-lg text-xs bg-surface-dark-secondary text-gray-300 focus:ring-1 focus:ring-brand-400/40"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_number} — {account.account_alias || account.broker_name || "Unknown"}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Content area ─────────────────────────────────────── */}
      <div key={`${market}-${tab}`} className="animate-tab-enter bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
        {market === "israeli" && tab === "holdings" && (
          <IsraeliStockHoldings refreshTrigger={refreshTrigger} />
        )}
        {market === "israeli" && tab === "transactions" && (
          <IsraeliStockTransactions refreshTrigger={refreshTrigger} />
        )}
        {market === "israeli" && tab === "dividends" && (
          <IsraeliStockDividends refreshTrigger={refreshTrigger} />
        )}
        {market === "international" && tab === "holdings" && (
          <WorldStockHoldings refreshTrigger={refreshTrigger} accountId={selectedAccountId} />
        )}
        {market === "international" && tab === "transactions" && (
          <WorldStockTransactions refreshTrigger={refreshTrigger} accountId={selectedAccountId} />
        )}
        {market === "international" && tab === "dividends" && (
          <WorldStockDividends refreshTrigger={refreshTrigger} accountId={selectedAccountId} />
        )}
      </div>

      {/* ── Upload modal ──────────────────────────────────────── */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setUploadOpen(false)}
        >
          <div className="bg-surface-dark-secondary border border-white/10 rounded-2xl w-full max-w-6xl max-h-[82vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-semibold text-gray-100">Upload Report</h2>
              <button
                onClick={() => setUploadOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Modal body */}
            <div className="p-6">
              <BrokerUploader onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        </div>
      )}

      {/* ── Pending review modal ──────────────────────────────── */}
      {pendingOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setPendingOpen(false)}
        >
          <div className="bg-surface-dark-secondary border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-gray-100">Review Pending</h2>
                <div className="flex gap-1 p-0.5 bg-surface-dark rounded-lg">
                  {MARKET_TABS.map(({ id, name }) => {
                    const count = id === "israeli" ? israeliPendingCount : worldPendingCount;
                    return (
                      <button
                        key={id}
                        onClick={() => setPendingMarket(id)}
                        className={`relative flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          pendingMarket === id
                            ? "bg-brand-400/10 text-brand-400"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {name}
                        {count > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-warn/20 text-warn text-[9px] font-bold px-1">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setPendingOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Modal body */}
            <div className="p-6">
              {pendingMarket === "israeli" ? (
                <PendingTransactionsReview
                  onApprovalComplete={handleApprovalComplete}
                  onCountChange={setIsraeliPendingCount}
                />
              ) : (
                <WorldPendingTransactionsReview
                  onApprovalComplete={handleApprovalComplete}
                  onCountChange={setWorldPendingCount}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Manual transaction entry modal ───────────────────── */}
      {manualOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setManualOpen(false)}
        >
          <div className="bg-surface-dark-secondary border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-semibold text-gray-100">Add Transaction</h2>
              <button
                onClick={() => setManualOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              {/* Market picker */}
              <div className="flex gap-1 p-0.5 bg-surface-dark rounded-lg w-fit">
                {MARKET_TABS.map(({ id, name }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleManualField("market", id)}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                      manualForm.market === id
                        ? "bg-brand-400/10 text-brand-400"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {manualForm.market === "international" ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Manual entry for International stocks is coming soon.
                </div>
              ) : (
                <>
                  {/* Type + Symbol row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                      <select
                        value={manualForm.transaction_type}
                        onChange={(e) => handleManualField("transaction_type", e.target.value)}
                        className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                      >
                        {TRANSACTION_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Symbol</label>
                      <input
                        type="text"
                        value={manualForm.symbol}
                        onChange={(e) => handleManualField("symbol", e.target.value)}
                        placeholder="e.g. TEVA"
                        className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40 uppercase"
                        required
                      />
                    </div>
                  </div>

                  {/* Company name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Company Name <span className="text-gray-600">(optional)</span></label>
                    <input
                      type="text"
                      value={manualForm.company_name}
                      onChange={(e) => handleManualField("company_name", e.target.value)}
                      placeholder="e.g. Teva Pharmaceutical"
                      className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                    />
                  </div>

                  {/* Date + Currency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={manualForm.transaction_date}
                        onChange={(e) => handleManualField("transaction_date", e.target.value)}
                        className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Currency</label>
                      <select
                        value={manualForm.currency}
                        onChange={(e) => handleManualField("currency", e.target.value)}
                        className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                      >
                        <option value="ILS">ILS (₪)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  {/* Quantity + Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={manualForm.quantity}
                        onChange={(e) => handleManualField("quantity", e.target.value)}
                        placeholder="0"
                        step="any"
                        min="0"
                        className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Price per Share</label>
                      <input
                        type="number"
                        value={manualForm.price}
                        onChange={(e) => handleManualField("price", e.target.value)}
                        placeholder="0.00"
                        step="any"
                        min="0"
                        className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                      />
                    </div>
                  </div>

                  {/* Total value + Commission */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Total Value</label>
                      <input
                        type="number"
                        value={manualForm.total_value}
                        onChange={(e) => handleManualField("total_value", e.target.value)}
                        placeholder="Auto-calculated"
                        step="any"
                        min="0"
                        className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Commission <span className="text-gray-600">(optional)</span></label>
                      <input
                        type="number"
                        value={manualForm.commission}
                        onChange={(e) => handleManualField("commission", e.target.value)}
                        placeholder="0.00"
                        step="any"
                        min="0"
                        className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setManualOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={manualSubmitting}
                      className="px-5 py-2 bg-brand-400/10 border border-brand-400/30 text-brand-400 hover:bg-brand-400/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                    >
                      {manualSubmitting ? "Saving…" : "Add Transaction"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
