"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  CalendarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";
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
        return <ArrowTrendingUpIcon className={`${sizeClass} text-green-600`} />;
      case "SELL":
        return <ArrowTrendingDownIcon className={`${sizeClass} text-red-600`} />;
      case "DIVIDEND":
        return <CurrencyDollarIcon className={`${sizeClass} text-blue-600`} />;
      case "DEPOSIT":
        return <BanknotesIcon className={`${sizeClass} text-purple-600`} />;
      case "WITHDRAWAL":
        return <BanknotesIcon className={`${sizeClass} text-orange-600`} />;
      default:
        return <ArrowRightIcon className={`${sizeClass} text-gray-600`} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "BUY":
        return "text-green-600 bg-green-50 border-green-200";
      case "SELL":
        return "text-red-600 bg-red-50 border-red-200";
      case "DIVIDEND":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "DEPOSIT":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "WITHDRAWAL":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
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
      return <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUpIcon className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 text-blue-600" />
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
          <h2 className="text-xl font-semibold text-gray-900">
            Israeli Stock Transactions
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
            >
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-3 bg-gray-200 rounded"></div>
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
          <h2 className="text-xl font-semibold text-gray-900">
            Israeli Stock Transactions
          </h2>
          <button onClick={fetchTransactions} className="btn-primary text-sm">
            Retry
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Israeli Stock Transactions
          </h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <CurrencyDollarIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Transactions Found
          </h3>
          <p className="text-gray-600 mb-4">
            Upload an Israeli investment PDF to see your transaction history
            here.
          </p>
          <p className="text-sm text-gray-500">
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
        <h2 className="text-xl font-semibold text-gray-900">
          Israeli Stock Transactions
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary text-sm flex items-center space-x-1"
          >
            <PlusIcon className="h-4 w-4" />
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
              <ArrowRightIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </div>

          <div className="metric-card bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-8 w-8 opacity-80" />
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
              <ArrowTrendingDownIcon className="h-8 w-8 opacity-80" />
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
              <CurrencyDollarIcon className="h-8 w-8 opacity-80" />
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
              <BanknotesIcon className="h-8 w-8 opacity-80" />
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
              <BanknotesIcon className="h-8 w-8 opacity-80" />
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
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">
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
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search Symbol or Company
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700"
            />
          </div>
          <div className="md:w-48">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700"
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
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ArrowRightIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Transactions Found
          </h3>
          <p className="text-gray-500">
            Upload a PDF report to import your Israeli stock transactions.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("transaction_date")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date & Time</span>
                        {getSortIcon("transaction_date")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("symbol")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Symbol</span>
                        {getSortIcon("symbol")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("transaction_type")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Type</span>
                        {getSortIcon("transaction_type")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("quantity")}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Quantity</span>
                        {getSortIcon("quantity")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Price</span>
                        {getSortIcon("price")}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("total_value")}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Total Value</span>
                        {getSortIcon("total_value")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(transaction.transaction_date)}
                            </div>
                            {transaction.transaction_time && (
                              <div className="text-xs text-gray-500">
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
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {transaction.symbol}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
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
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {isDeposit ? "-" : formatNumber(transaction.quantity)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {isDeposit ? "-" : formatCurrency(transaction.price)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(transaction.total_value)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
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
                                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                title="Edit transaction"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded"
                                title="Delete transaction"
                              >
                                <TrashIcon className="h-4 w-4" />
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
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of{" "}
                  {filteredTransactions.length} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 text-gray-500">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
