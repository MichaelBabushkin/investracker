"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Calendar,
  Banknote,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { israeliStocksAPI } from "@/services/api";
import { IsraeliStockTransaction } from "@/types/israeli-stocks";
import StockLogo from "./StockLogo";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface IsraeliStockTransactionsProps {
  refreshTrigger?: number;
}

export default function IsraeliStockTransactions({
  refreshTrigger,
}: IsraeliStockTransactionsProps) {
  const [transactions, setTransactions] = useState<IsraeliStockTransaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<IsraeliStockTransaction | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("transaction_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await israeliStocksAPI.getTransactions();

      setTransactions(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger]);

  // Reset to page 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchTerm, sortField, sortDirection]);

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      await israeliStocksAPI.deleteTransaction(transactionId);
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    } catch (err: any) {
      alert(
        "Failed to delete transaction: " +
          (err.response?.data?.detail || err.message)
      );
    }
  };

  const handleCreateTransaction = async (transactionData: any) => {
    try {
      await israeliStocksAPI.createTransaction(transactionData);
      fetchTransactions(); // Refresh the list
      setShowAddForm(false);
    } catch (err: any) {
      alert(
        "Failed to create transaction: " +
          (err.response?.data?.detail || err.message)
      );
    }
  };

  const handleUpdateTransaction = async (
    transactionId: number,
    transactionData: any
  ) => {
    try {
      await israeliStocksAPI.updateTransaction(transactionId, transactionData);
      fetchTransactions(); // Refresh the list
      setEditingTransaction(null);
    } catch (err: any) {
      alert(
        "Failed to update transaction: " +
          (err.response?.data?.detail || err.message)
      );
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "₪0.00";
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num?: number) => {
    if (!num) return "0";
    return new Intl.NumberFormat("he-IL").format(num);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("he-IL");
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    return timeStr;
  };

  const getTransactionIcon = (type: string, size: "sm" | "md" = "md") => {
    const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    switch (type) {
      case "BUY":
        return <TrendingUp className={`${sizeClass} text-gain`} />;
      case "SELL":
        return <TrendingDown className={`${sizeClass} text-loss`} />;
      case "DIVIDEND":
        return <DollarSign className={`${sizeClass} text-brand-400`} />;
      case "DEPOSIT":
        return <Banknote className={`${sizeClass} text-purple-400`} />;
      case "WITHDRAWAL":
        return <Banknote className={`${sizeClass} text-orange-400`} />;
      default:
        return <ArrowRight className={`${sizeClass} text-gray-400`} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "BUY":
        return "text-gain bg-gain/10 border-gain/20";
      case "SELL":
        return "text-loss bg-loss/10 border-loss/20";
      case "DIVIDEND":
        return "text-brand-400 bg-brand-400/10 border-brand-400/20";
      case "DEPOSIT":
        return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      case "WITHDRAWAL":
        return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      default:
        return "text-gray-400 bg-surface-dark border-white/10";
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Default to descending for new field
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 text-brand-400" />
    ) : (
      <ChevronDown className="h-4 w-4 text-brand-400" />
    );
  };

  const totalBought = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "BUY")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalSold = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "SELL")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalDeposits = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "DEPOSIT")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalWithdrawals = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "WITHDRAWAL")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalCommission = transactions.reduce((sum, t) => {
    const raw = (t as any).commission;
    if (raw === null || raw === undefined || raw === "") return sum;
    let num: number | null = null;
    if (typeof raw === "number") {
      num = raw;
    } else if (typeof raw === "string") {
      const cleaned = raw.replace(/₪|,/g, "").trim();
      if (cleaned && !isNaN(Number(cleaned))) num = Number(cleaned);
    }
    return sum + (num ? num : 0);
  }, 0);

  // Monthly activity dataset (BUY / SELL) for chart
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; buy: number; sell: number }> =
      {};
    const parseDate = (d?: string): Date | null => {
      if (!d) return null;
      // Try ISO first
      let dateObj: Date | null = null;
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
        const iso = new Date(d);
        if (!isNaN(iso.getTime())) return iso;
      }
      // Try DD/MM/YY or DD/MM/YYYY
      const m = d.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
      if (m) {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10) - 1;
        let year = parseInt(m[3], 10);
        if (year < 100) year += year < 50 ? 2000 : 1900; // heuristic
        dateObj = new Date(year, month, day);
        if (!isNaN(dateObj.getTime())) return dateObj;
      }
      const tryAny = new Date(d);
      return isNaN(tryAny.getTime()) ? null : tryAny;
    };
    transactions.forEach((t) => {
      const type = (t.transaction_type || "").toUpperCase();
      if (type !== "BUY" && type !== "SELL") return; // exclude dividends
      const dt = parseDate(t.transaction_date as any);
      if (!dt) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (!map[key]) map[key] = { month: key, buy: 0, sell: 0 };
      const val = t.total_value || 0;
      if (type === "BUY") map[key].buy += val;
      else if (type === "SELL") map[key].sell += val;
    });
    // Sort chronologically
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-100">
            Israeli Stock Transactions
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-surface-dark-secondary p-6 rounded-xl border border-white/10"
            >
              <div className="h-4 bg-white/10 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-3 bg-white/10 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-100">
            Israeli Stock Transactions
          </h2>
          <button onClick={fetchTransactions} className="btn-primary text-sm">
            Retry
          </button>
        </div>
        <div className="bg-loss/10 border border-loss/20 rounded-xl p-4">
          <p className="text-loss">{error}</p>
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-100">
            Israeli Stock Transactions
          </h2>
        </div>
        <div className="bg-surface-dark border border-white/10 rounded-xl p-12 text-center">
          <DollarSign className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">
            No Transactions Found
          </h3>
          <p className="text-gray-400 mb-4">
            Upload an Israeli investment PDF to see your transaction history
            here.
          </p>
          <p className="text-sm text-gray-400">
            We support buy, sell, and dividend transactions from Israeli
            brokers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-100">
          Israeli Stock Transactions
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary text-sm flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
          <button onClick={fetchTransactions} className="btn-secondary text-sm">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="metric-card">
            <div className="flex items-center">
              <ArrowRight className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </div>

          <div className="metric-card bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Overall Bought</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalBought)}
                </p>
              </div>
            </div>
          </div>

          <div className="metric-card bg-gradient-to-r from-red-500 to-red-600">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Overall Sold</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalSold)}
                </p>
              </div>
            </div>
          </div>

          <div className="metric-card bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Commission Paid</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalCommission)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Summary */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="metric-card bg-gradient-to-r from-purple-500 to-purple-600">
            <div className="flex items-center">
              <Banknote className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Deposits</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalDeposits)}
                </p>
              </div>
            </div>
          </div>

          <div className="metric-card bg-gradient-to-r from-orange-500 to-orange-600">
            <div className="flex items-center">
              <Banknote className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Withdrawals</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalWithdrawals)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Activity Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">
              Monthly Trading Activity (Buy vs Sell)
            </h3>
            <span className="text-xs text-gray-400">
              Last {monthlyData.length} months
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="buy"
                  name="Buy"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="sell"
                  name="Sell"
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Search Symbol or Company
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border border-white/10 rounded-md text-sm focus:ring-brand-400/40 focus:border-brand-400 text-gray-300"
            />
          </div>
          <div className="md:w-48">
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Transaction Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-white/10 rounded-md text-sm focus:ring-brand-400/40 focus:border-brand-400 text-gray-300"
            >
              <option value="ALL">All Types</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
              <option value="DIVIDEND">Dividend</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-surface-dark rounded-xl">
          <ArrowRight className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">
            No Transactions Found
          </h3>
          <p className="text-gray-400">
            Upload a PDF report to import your Israeli stock transactions.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-surface-dark-secondary border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-surface-dark">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 select-none"
                      onClick={() => handleSort("transaction_date")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date & Time</span>
                        {getSortIcon("transaction_date")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 select-none"
                      onClick={() => handleSort("symbol")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Symbol</span>
                        {getSortIcon("symbol")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 select-none"
                      onClick={() => handleSort("transaction_type")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Type</span>
                        {getSortIcon("transaction_type")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 select-none"
                      onClick={() => handleSort("quantity")}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Quantity</span>
                        {getSortIcon("quantity")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 select-none"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Price</span>
                        {getSortIcon("price")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 select-none"
                      onClick={() => handleSort("total_value")}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Total Value</span>
                        {getSortIcon("total_value")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface-dark-secondary divide-y divide-white/5">
                  {(() => {
                    // Apply filters
                    let filteredTransactions = transactions.filter((t) => {
                      const matchesType = filterType === "ALL" || t.transaction_type === filterType;
                      const matchesSearch = !searchTerm || 
                        t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.company_name.toLowerCase().includes(searchTerm.toLowerCase());
                      return matchesType && matchesSearch;
                    });

                    // Apply sorting
                    filteredTransactions.sort((a, b) => {
                      let aValue: any = a[sortField as keyof IsraeliStockTransaction];
                      let bValue: any = b[sortField as keyof IsraeliStockTransaction];

                      // Handle date sorting specially
                      if (sortField === "transaction_date") {
                        aValue = new Date(aValue || 0).getTime();
                        bValue = new Date(bValue || 0).getTime();
                      }
                      // Handle numeric fields
                      else if (["quantity", "price", "total_value"].includes(sortField)) {
                        aValue = Number(aValue) || 0;
                        bValue = Number(bValue) || 0;
                      }
                      // Handle string fields
                      else {
                        aValue = String(aValue || "").toLowerCase();
                        bValue = String(bValue || "").toLowerCase();
                      }

                      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
                      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
                      return 0;
                    });

                    // Apply pagination
                    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
                    const startIdx = (currentPage - 1) * itemsPerPage;
                    const endIdx = startIdx + itemsPerPage;
                    const paginatedTransactions = filteredTransactions.slice(startIdx, endIdx);

                    return paginatedTransactions.map((transaction) => {
                      const isDeposit = transaction.transaction_type === "DEPOSIT" || transaction.transaction_type === "WITHDRAWAL";
                      
                      return (
                        <tr key={transaction.id} className="hover:bg-white/5">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-100">
                              {formatDate(transaction.transaction_date)}
                            </div>
                            {transaction.transaction_time && (
                              <div className="text-xs text-gray-400">
                                {formatTime(transaction.transaction_time)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <StockLogo
                                symbol={transaction.symbol}
                                logoSvg={transaction.logo_svg}
                                size="sm"
                                className="flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-100 truncate">
                                  {transaction.symbol}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                  {transaction.company_name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getTransactionColor(
                                transaction.transaction_type
                              )}`}
                            >
                              {getTransactionIcon(transaction.transaction_type, "sm")}
                              <span className="ml-1">{transaction.transaction_type}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-100">
                            {isDeposit ? "-" : formatNumber(transaction.quantity)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-100">
                            {isDeposit ? "-" : formatCurrency(transaction.price)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-100">
                            {formatCurrency(transaction.total_value)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400">
                            {(transaction.commission && Number(transaction.commission) > 0) || (transaction.tax && Number(transaction.tax) > 0) ? (
                              <div>
                                {transaction.commission && Number(transaction.commission) > 0 && (
                                  <div>Fee: {formatCurrency(transaction.commission)}</div>
                                )}
                                {transaction.tax && Number(transaction.tax) > 0 ? (
                                  <div>Tax: {formatCurrency(transaction.tax)}</div>
                                ):''}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingTransaction(transaction)}
                                className="text-brand-400 hover:text-brand-300 p-1 rounded"
                                title="Edit transaction"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="text-loss hover:text-loss p-1 rounded"
                                title="Delete transaction"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {(() => {
            const filteredTransactions = transactions.filter((t) => {
              const matchesType = filterType === "ALL" || t.transaction_type === filterType;
              const matchesSearch = !searchTerm || 
                t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.company_name.toLowerCase().includes(searchTerm.toLowerCase());
              return matchesType && matchesSearch;
            });
            const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
            
            if (totalPages <= 1) return null;

            return (
              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of{" "}
                  {filteredTransactions.length} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-white/10 rounded-md text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first, last, current, and surrounding pages
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 border rounded-md text-sm font-medium ${
                              currentPage === page
                                ? "bg-brand-400 text-white border-brand-400"
                                : "border-white/10 text-gray-300 hover:bg-white/5"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-white/10 rounded-md text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
