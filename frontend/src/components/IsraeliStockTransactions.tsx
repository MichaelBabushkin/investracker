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
} from "@heroicons/react/24/outline";
import { israeliStocksAPI } from "@/services/api";
import { IsraeliStockTransaction } from "@/types/israeli-stocks";
import StockLogo from "./StockLogo";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "BUY":
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />;
      case "SELL":
        return <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />;
      case "DIVIDEND":
        return <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <ArrowRightIcon className="h-5 w-5 text-gray-600" />;
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
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const totalBought = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "BUY")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalSold = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "SELL")
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
    const map: Record<string, { month: string; buy: number; sell: number }> = {};
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
        if (year < 100) year += (year < 50 ? 2000 : 1900); // heuristic
        dateObj = new Date(year, month, day);
        if (!isNaN(dateObj.getTime())) return dateObj;
      }
      const tryAny = new Date(d);
      return isNaN(tryAny.getTime()) ? null : tryAny;
    };
    transactions.forEach(t => {
      const type = (t.transaction_type || '').toUpperCase();
      if (type !== 'BUY' && type !== 'SELL') return; // exclude dividends
      const dt = parseDate(t.transaction_date as any);
      if (!dt) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
      if (!map[key]) map[key] = { month: key, buy: 0, sell: 0 };
      const val = t.total_value || 0;
      if (type === 'BUY') map[key].buy += val;
      else if (type === 'SELL') map[key].sell += val;
    });
    // Sort chronologically
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
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

      {/* Monthly Activity Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Monthly Trading Activity (Buy vs Sell)</h3>
            <span className="text-xs text-gray-400">Last {monthlyData.length} months</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v:any) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="buy" name="Buy" fill="#16a34a" radius={[4,4,0,0]} />
                <Bar dataKey="sell" name="Sell" fill="#dc2626" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Transactions List */}
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
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="investment-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <StockLogo
                        symbol={transaction.symbol}
                        logoSvg={transaction.logo_svg}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {transaction.symbol}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getTransactionColor(
                            transaction.transaction_type
                          )}`}
                        >
                          {transaction.transaction_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {transaction.company_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Security: {transaction.security_no}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm font-medium">
                        {formatDate(transaction.transaction_date)}
                      </p>
                      {transaction.transaction_time && (
                        <p className="text-xs text-gray-400">
                          {formatTime(transaction.transaction_time)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="text-sm font-medium">
                        {formatNumber(transaction.quantity)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(transaction.price)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Total Value</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(transaction.total_value)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Fees & Tax</p>
                      <div className="text-sm">
                        {transaction.commission && (
                          <p className="text-gray-600">
                            Fee: {formatCurrency(transaction.commission)}
                          </p>
                        )}
                        {transaction.tax && (
                          <p className="text-gray-600">
                            Tax: {formatCurrency(transaction.tax)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Added: {formatDate(transaction.created_at)}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 ml-4 flex space-x-2">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
