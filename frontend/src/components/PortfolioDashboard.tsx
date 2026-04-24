"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Upload, Clock, Landmark, Globe2, Building2, ArrowRight, DollarSign, X, Plus } from "lucide-react";
import StockSymbolSearch from "./StockSymbolSearch";
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

type Market = "israeli" | "international" | "cash";
type Tab = "holdings" | "transactions" | "dividends";

const MARKET_TABS: Array<{ id: Market; name: string; icon: React.ElementType }> = [
  { id: "israeli", name: "Israeli Stocks", icon: Landmark },
  { id: "international", name: "International", icon: Globe2 },
  { id: "cash", name: "Cash", icon: DollarSign },
];

const CONTENT_TABS: Array<{ id: Tab; name: string; icon: React.ElementType }> = [
  { id: "holdings", name: "Holdings", icon: Building2 },
  { id: "transactions", name: "Transactions", icon: ArrowRight },
  { id: "dividends", name: "Dividends", icon: DollarSign },
];

const TRANSACTION_TYPES = ["BUY", "SELL", "DIVIDEND"];

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

  // Cash tab state
  const [cashType, setCashType] = useState<"DEPOSIT" | "WITHDRAWAL" | "CONVERT">("DEPOSIT");
  const [cashAmount, setCashAmount] = useState("");
  const [cashCurrency, setCashCurrency] = useState("ILS");
  const [cashDate, setCashDate] = useState(new Date().toISOString().slice(0, 10));
  // convertEnabled is derived from cashType === "CONVERT" (no separate state needed)
  const [convertRate, setConvertRate] = useState("");
  const [convertToCurrency, setConvertToCurrency] = useState("USD");
  const [autoRate, setAutoRate] = useState<number | null>(null);
  // Cash balance for portfolio view + modal guardrail
  const [cashBalanceData, setCashBalanceData] = useState<{
    available_cash: number;
    total_deposits: number;
    total_withdrawals: number;
    total_stock_purchases: number;
    total_stock_sales: number;
    total_dividends: number;
    total_commissions: number;
  } | null>(null);
  const [cashBalanceLoading, setCashBalanceLoading] = useState(false);
  const [worldCashUSD, setWorldCashUSD] = useState<number | null>(null);

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

  // Fetch cash balance whenever the Cash market tab is active, or the modal opens on cash
  const fetchCashBalance = useCallback(async () => {
    setCashBalanceLoading(true);
    try {
      const [ilsData, worldData] = await Promise.all([
        israeliStocksAPI.getCashBalance(),
        worldStocksAPI.getPortfolioDashboard(),
      ]);
      setCashBalanceData(ilsData);
      setWorldCashUSD(worldData?.portfolioData?.totalCash ?? null);
    } catch { /* silent */ } finally {
      setCashBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (market === "cash") fetchCashBalance();
  }, [market, refreshTrigger, fetchCashBalance]);

  // Keep convertToCurrency different from cashCurrency
  useEffect(() => {
    if (convertToCurrency === cashCurrency) {
      const other = ["ILS", "USD", "EUR"].find((c) => c !== cashCurrency);
      if (other) setConvertToCurrency(other);
    }
  }, [cashCurrency, convertToCurrency]);

  // Fetch live USD/ILS rate whenever the cash tab becomes visible in the modal
  useEffect(() => {
    if (manualOpen && manualForm.market === "cash") {
      fetchCashBalance();
      worldStocksAPI.getExchangeRate().then((r) => {
        if (r.usd_ils) {
          setAutoRate(r.usd_ils);
          setConvertRate(r.usd_ils.toFixed(4));
        }
      }).catch(() => {});
    }
  }, [manualOpen, manualForm.market, fetchCashBalance]);

  // ── Cash submit ───────────────────────────────────────────────────────────
  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAmount || parseFloat(cashAmount) <= 0) {
      toast.error("Amount is required");
      return;
    }
    if (!cashDate) {
      toast.error("Date is required");
      return;
    }

    const isConvert = cashType === "CONVERT";

    // Determine the final stored amount and currency
    // Rate is always "ILS per USD". Divide when going ILS→foreign, multiply when foreign→ILS.
    const storedAmount = isConvert && convertRate && convertToCurrency !== cashCurrency
      ? cashCurrency === "ILS"
        ? (parseFloat(cashAmount) / parseFloat(convertRate)).toFixed(2)
        : (parseFloat(cashAmount) * parseFloat(convertRate)).toFixed(2)
      : cashAmount;
    // Backend transaction type: CONVERT → FX_CONVERSION
    const backendType = isConvert ? "FX_CONVERSION" : cashType;

    const ilsAmount = parseFloat(cashAmount);
    const rate = parseFloat(convertRate) || 0;
    const usdAmount = isConvert && rate > 0
      ? cashCurrency === "ILS" ? ilsAmount / rate : ilsAmount * rate
      : 0;

    setManualSubmitting(true);
    try {
      // 1. Record ILS side (deposit / withdrawal / FX outflow)
      await israeliStocksAPI.createTransaction({
        transaction_type: backendType,
        transaction_date: cashDate,
        total_value: ilsAmount,
        currency: cashCurrency,
        symbol: "CASH",
        company_name: isConvert ? "Cash Conversion" : cashType === "DEPOSIT" ? "Cash Deposit" : "Cash Withdrawal",
        quantity: 0,
        price: 0,
        commission: 0,
      });

      // 2. For conversions: also record the USD inflow in world stocks
      if (isConvert && usdAmount > 0) {
        await worldStocksAPI.createTransaction({
          symbol: "USD",
          transaction_type: "CURRENCY_CONVERSION",
          quantity: usdAmount,        // USD amount received
          price: rate,                // exchange rate (ILS per USD)
          total_value: ilsAmount,     // ILS amount spent
          currency: cashCurrency,
          transaction_date: cashDate,
          company_name: `Currency Conversion ${cashCurrency}→${convertToCurrency}`,
          commission: 0,
          tax: 0,
        });
      }

      const label = isConvert ? "Conversion" : cashType === "DEPOSIT" ? "Deposit" : "Withdrawal";
      toast.success(`${label} recorded`);
      setManualOpen(false);
      setCashAmount("");
      setRefreshTrigger((t) => t + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to record cash transaction");
    } finally {
      setManualSubmitting(false);
    }
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
    const isDepositWithdrawal = ["DEPOSIT", "WITHDRAWAL"].includes(manualForm.transaction_type);
    if (!isDepositWithdrawal && !manualForm.symbol.trim()) {
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
        await worldStocksAPI.createTransaction({
          symbol: manualForm.symbol.trim().toUpperCase(),
          company_name: manualForm.company_name.trim(),
          transaction_type: manualForm.transaction_type,
          transaction_date: manualForm.transaction_date,
          quantity: parseFloat(manualForm.quantity) || 0,
          price: parseFloat(manualForm.price) || 0,
          total_value: parseFloat(manualForm.total_value) || 0,
          commission: parseFloat(manualForm.commission) || 0,
          currency: manualForm.currency,
          account_id: selectedAccountId || null,
        });
        toast.success("Transaction added successfully");
        setManualOpen(false);
        setManualForm(emptyManualForm());
        setRefreshTrigger((t) => t + 1);
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

      {/* ── Content tabs (hidden on Cash tab) ───────────────── */}
      {market !== "cash" && (
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

          {market === "international" && accounts.length > 0 && (
            <select
              value={selectedAccountId || ""}
              onChange={(e) =>
                setSelectedAccountId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="mb-1 pl-3 pr-10 py-1.5 border border-white/10 rounded-lg text-xs bg-surface-dark-secondary text-gray-300 focus:ring-1 focus:ring-brand-400/40"
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
      )}

      {/* ── Content area ─────────────────────────────────────── */}
      {market === "cash" ? (
        /* ── Cash balance view ─────────────────────────────── */
        <div className="mt-6 space-y-4">
          {cashBalanceLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6 animate-pulse">
                  <div className="h-3 w-16 bg-white/10 rounded mb-4" />
                  <div className="h-8 w-32 bg-white/10 rounded mb-6" />
                  <div className="space-y-2">
                    {[0,1,2,3].map(j => <div key={j} className="h-3 bg-white/5 rounded" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ILS cash card */}
              <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Israeli Shekel</span>
                  <span className="text-xs text-gray-600">ILS</span>
                </div>
                <p className={`text-3xl font-bold tabular-nums mb-5 ${(cashBalanceData?.available_cash ?? 0) >= 0 ? "text-gray-100" : "text-loss"}`}>
                  ₪{(cashBalanceData?.available_cash ?? 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Deposits</span>
                    <span className="text-gain tabular-nums">+₪{(cashBalanceData?.total_deposits ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Withdrawals</span>
                    <span className="text-loss tabular-nums">−₪{(cashBalanceData?.total_withdrawals ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Stock purchases</span>
                    <span className="text-loss tabular-nums">−₪{(cashBalanceData?.total_stock_purchases ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Stock sales</span>
                    <span className="text-gain tabular-nums">+₪{(cashBalanceData?.total_stock_sales ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Dividends</span>
                    <span className="text-gain tabular-nums">+₪{(cashBalanceData?.total_dividends ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
                  </div>
                  {(cashBalanceData?.total_commissions ?? 0) > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Commissions & fees</span>
                      <span className="text-loss tabular-nums">−₪{(cashBalanceData?.total_commissions ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                  <div className="border-t border-white/8 pt-2 flex justify-between font-semibold text-gray-200">
                    <span>Available</span>
                    <span className="tabular-nums">₪{(cashBalanceData?.available_cash ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              {/* USD cash card */}
              <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">US Dollar</span>
                  <span className="text-xs text-gray-600">USD</span>
                </div>
                <p className={`text-3xl font-bold tabular-nums mb-5 ${(worldCashUSD ?? 0) >= 0 ? "text-gray-100" : "text-loss"}`}>
                  ${(worldCashUSD ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">
                  Derived from international stock sales, dividends, and FX deposits minus purchases.
                </p>
                {worldCashUSD === null && (
                  <p className="text-xs text-gray-600 mt-2">No international activity yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
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
      )}

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
            <form
              onSubmit={manualForm.market === "cash" ? handleCashSubmit : handleManualSubmit}
              className="p-6 space-y-4"
            >
              {/* Market / tab picker */}
              <div className="flex gap-1 p-0.5 bg-surface-dark rounded-lg">
                {MARKET_TABS.map(({ id, name, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setManualForm((prev) => ({
                      ...prev,
                      market: id as Market,
                      currency: id === "israeli" ? "ILS" : id === "cash" ? "ILS" : "USD",
                      symbol: "",
                      company_name: "",
                      transaction_type: id === "cash" ? "BUY" : prev.transaction_type,
                    }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      manualForm.market === id
                        ? id === "cash"
                          ? "bg-info/10 text-info"
                          : "bg-brand-400/10 text-brand-400"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Icon size={12} />
                    {name}
                  </button>
                ))}
              </div>

              {(() => {
                // ── Cash tab ─────────────────────────────────────────────────
                if (manualForm.market === "cash") {
                  const isConvertMode = cashType === "CONVERT";
                  const fromSymbol = cashCurrency === "USD" ? "$" : cashCurrency === "EUR" ? "€" : "₪";
                  const toSymbol   = convertToCurrency === "USD" ? "$" : convertToCurrency === "EUR" ? "€" : "₪";
                  const parsedAmount = parseFloat(cashAmount) || 0;
                  const parsedRate   = parseFloat(convertRate) || 0;
                  const isDivide = cashCurrency === "ILS" && convertToCurrency !== "ILS";
                  const convertedAmount: number | null = isConvertMode && parsedAmount > 0 && parsedRate > 0
                    ? isDivide ? parsedAmount / parsedRate : parsedAmount * parsedRate
                    : null;
                  const otherCurrencies = ["ILS", "USD", "EUR"].filter((c) => c !== cashCurrency);
                  const availableInSource: number | null = cashCurrency === "ILS"
                    ? (cashBalanceData?.available_cash ?? null)
                    : cashCurrency === "USD" ? worldCashUSD : null;
                  const exceedsBalance = cashType === "WITHDRAWAL"
                    && availableInSource !== null && parsedAmount > 0
                    && parsedAmount > availableInSource;

                  return (
                    <div className="min-h-[380px] flex flex-col gap-4">
                      {/* 3-button toggle */}
                      <div className="flex gap-2">
                        {(["DEPOSIT", "WITHDRAWAL", "CONVERT"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setCashType(t)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                              cashType === t
                                ? t === "DEPOSIT"
                                  ? "bg-gain/10 border-gain/30 text-gain"
                                  : t === "WITHDRAWAL"
                                  ? "bg-loss/10 border-loss/30 text-loss"
                                  : "bg-info/10 border-info/30 text-info"
                                : "bg-surface-dark border-white/10 text-gray-500 hover:text-gray-300"
                            }`}
                          >
                            {t === "DEPOSIT" ? "↓ Deposit" : t === "WITHDRAWAL" ? "↑ Withdrawal" : "⇄ Convert"}
                          </button>
                        ))}
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
                        <input
                          type="date"
                          value={cashDate}
                          onChange={(e) => setCashDate(e.target.value)}
                          required
                          className="w-full pl-3 pr-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-info/40"
                        />
                      </div>

                      {/* Amount + From Currency */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-400">
                              {isConvertMode ? "From amount" : "Amount"}
                            </label>
                            {!isConvertMode && availableInSource !== null && (
                              <span className="text-xs text-gray-500">
                                Available: <span className="text-gray-300">{fromSymbol}{availableInSource.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            placeholder="0.00"
                            step="any"
                            min="0"
                            required
                            className={`w-full px-3 py-2 bg-surface-dark border rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 ${exceedsBalance ? "border-loss/50 focus:ring-loss/40" : "border-white/10 focus:ring-info/40"}`}
                          />
                          {exceedsBalance && (
                            <p className="mt-1 text-xs text-loss">Exceeds available balance</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            {isConvertMode ? "From currency" : "Currency"}
                          </label>
                          <select
                            value={cashCurrency}
                            onChange={(e) => {
                              setCashCurrency(e.target.value);
                              if (e.target.value === convertToCurrency) {
                                setConvertToCurrency(otherCurrencies[0]);
                              }
                            }}
                            className="w-full pl-3 pr-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-info/40"
                          >
                            <option value="ILS">ILS (₪)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                          </select>
                        </div>
                      </div>

                      {/* Convert mode: To currency + Rate */}
                      {isConvertMode ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">To currency</label>
                            <select
                              value={convertToCurrency}
                              onChange={(e) => setConvertToCurrency(e.target.value)}
                              className="w-full pl-3 pr-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-info/40"
                            >
                              {["ILS", "USD", "EUR"].filter((c) => c !== cashCurrency).map((c) => (
                                <option key={c} value={c}>{c === "ILS" ? "ILS (₪)" : c === "USD" ? "USD ($)" : "EUR (€)"}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              Rate (ILS/USD)
                              {autoRate !== null && (
                                <button
                                  type="button"
                                  onClick={() => setConvertRate((autoRate as number).toFixed(4))}
                                  className="ml-2 text-info hover:underline"
                                >
                                  use live ({(autoRate as number).toFixed(4)})
                                </button>
                              )}
                            </label>
                            <input
                              type="number"
                              value={convertRate}
                              onChange={(e) => setConvertRate(e.target.value)}
                              placeholder="e.g. 3.65"
                              step="any"
                              min="0"
                              className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-info/40"
                            />
                          </div>
                        </div>
                      ) : (
                        /* Spacer keeps height consistent with Convert mode */
                        <div className="h-[62px]" />
                      )}

                      {/* Formula readout — only in Convert mode */}
                      <div className="h-5">
                        {isConvertMode && convertedAmount !== null && (
                          <p className="text-xs text-gray-400">
                            {fromSymbol}{parsedAmount.toLocaleString()} {isDivide ? "÷" : "×"} {parsedRate} = <span className="text-gray-100 font-semibold">{toSymbol}{(convertedAmount as number).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          </p>
                        )}
                      </div>

                      {/* Preview card — fixed height slot */}
                      <div className="rounded-xl border overflow-hidden" style={{ minHeight: "88px" }}>
                        {parsedAmount > 0 ? (
                          <div className={`p-4 h-full ${
                            cashType === "DEPOSIT" ? "bg-gain/5 border-gain/15" :
                            cashType === "WITHDRAWAL" ? "bg-loss/5 border-loss/15" :
                            "bg-info/5 border-info/15"
                          }`}>
                            <p className="text-xs text-gray-500 mb-2">Preview</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-2xl font-bold tabular-nums ${
                                cashType === "DEPOSIT" ? "text-gain" :
                                cashType === "WITHDRAWAL" ? "text-loss" : "text-info"
                              }`}>
                                {cashType === "DEPOSIT" ? "+" : cashType === "WITHDRAWAL" ? "−" : ""}{fromSymbol}{parsedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                              {isConvertMode && convertedAmount !== null && (
                                <>
                                  <ArrowRight className="h-5 w-5 text-gray-500 shrink-0" />
                                  <div>
                                    <span className="text-2xl font-bold tabular-nums text-gray-100">
                                      {toSymbol}{(convertedAmount as number).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">at rate {parsedRate}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{cashDate}</p>
                          </div>
                        ) : (
                          <div className="p-4 h-full bg-surface-dark flex items-center justify-center">
                            <p className="text-xs text-gray-600">Enter an amount to see preview</p>
                          </div>
                        )}
                      </div>

                      {/* Submit */}
                      <div className="flex justify-end gap-2 pt-2 mt-auto">
                        <button type="button" onClick={() => setManualOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={manualSubmitting || (isConvertMode && (!convertRate || !convertToCurrency))}
                          className="px-5 py-2 bg-info/10 border border-info/30 text-info hover:bg-info/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                        >
                          {manualSubmitting ? "Saving…" : isConvertMode ? "Record Conversion" : cashType === "DEPOSIT" ? "Record Deposit" : "Record Withdrawal"}
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── Stock / Dividend tab ──────────────────────────────────────
                const isDepositWithdrawal = ["DEPOSIT", "WITHDRAWAL"].includes(manualForm.transaction_type);
                const currencySymbol = manualForm.currency === "USD" ? "$" : manualForm.currency === "EUR" ? "€" : "₪";
                const isIsraeli = manualForm.market === "israeli";

                return (
                  <>
                    {/* Account selector — International only */}
                    {manualForm.market === "international" && accounts.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Account <span className="text-gray-600">(optional)</span></label>
                        <select
                          value={selectedAccountId || ""}
                          onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full pl-3 pr-10 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                        >
                          <option value="">No specific account</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.account_number} — {acc.account_alias || acc.broker_name || "Unknown"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Type row — full width for deposit/withdrawal, half for trades */}
                    <div className={isDepositWithdrawal ? "" : "grid grid-cols-2 gap-3"}>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                        <select
                          value={manualForm.transaction_type}
                          onChange={(e) => handleManualField("transaction_type", e.target.value)}
                          className="w-full pl-3 pr-10 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                        >
                          {TRANSACTION_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Symbol — hidden for deposit/withdrawal */}
                      {!isDepositWithdrawal && (
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Symbol</label>
                          <StockSymbolSearch
                            market={manualForm.market}
                            value={manualForm.symbol}
                            onChange={(symbol, companyName) =>
                              setManualForm((prev) => ({ ...prev, symbol, company_name: companyName }))
                            }
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* Company name — hidden for deposit/withdrawal */}
                    {!isDepositWithdrawal && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Company Name <span className="text-gray-600">(optional)</span></label>
                        <input
                          type="text"
                          value={manualForm.company_name}
                          onChange={(e) => handleManualField("company_name", e.target.value)}
                          placeholder={isIsraeli ? "e.g. Teva Pharmaceutical" : "e.g. Apple Inc."}
                          className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                        />
                      </div>
                    )}

                    {/* Date + Currency */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
                        <input
                          type="date"
                          value={manualForm.transaction_date}
                          onChange={(e) => handleManualField("transaction_date", e.target.value)}
                          className="w-full pl-3 pr-10 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Currency</label>
                        <select
                          value={manualForm.currency}
                          onChange={(e) => handleManualField("currency", e.target.value)}
                          className="w-full pl-3 pr-10 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                        >
                          {isIsraeli ? (
                            <>
                              <option value="ILS">ILS (₪)</option>
                              <option value="USD">USD ($)</option>
                            </>
                          ) : (
                            <>
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                              <option value="ILS">ILS (₪)</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Quantity + Price — hidden for deposit/withdrawal */}
                    {!isDepositWithdrawal && (
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
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Price per Share
                            {isIsraeli && <span className="ml-1 text-gray-600 font-normal">({currencySymbol} shekels)</span>}
                          </label>
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
                    )}

                    {/* Total value + Commission */}
                    <div className={isDepositWithdrawal ? "" : "grid grid-cols-2 gap-3"}>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          {isDepositWithdrawal ? `Amount (${currencySymbol})` : "Total Value"}
                        </label>
                        <input
                          type="number"
                          value={manualForm.total_value}
                          onChange={(e) => handleManualField("total_value", e.target.value)}
                          placeholder={isDepositWithdrawal ? "0.00" : "Auto-calculated"}
                          step="any"
                          min="0"
                          className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                        />
                      </div>

                      {/* Commission — hidden for deposit/withdrawal */}
                      {!isDepositWithdrawal && (
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
                      )}
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
                );
              })()}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
