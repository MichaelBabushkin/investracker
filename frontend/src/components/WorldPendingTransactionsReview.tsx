"use client";

import React, { useState, useEffect } from "react";
import { worldStocksAPI } from "@/services/api";
import { Check, X, Pencil } from "lucide-react";

interface PendingWorldTransaction {
  id: number;
  upload_batch_id: string;
  pdf_filename: string;
  transaction_date: string;
  transaction_time: string | null;
  ticker: string;
  stock_name: string;
  transaction_type: string;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  commission: number | null;
  tax: number | null;
  currency: string;
  exchange_rate: number | null;
  status: string;
  review_notes: string | null;
  created_at: string;
}

interface WorldPendingTransactionsReviewProps {
  batchId?: string;
  onApprovalComplete?: (completedBatchId?: string) => void;
}

export default function WorldPendingTransactionsReview({
  batchId,
  onApprovalComplete,
}: WorldPendingTransactionsReviewProps) {
  const [transactions, setTransactions] = useState<PendingWorldTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await worldStocksAPI.getPendingTransactions(
        batchId,
        "pending"
      );
      setTransactions(data.transactions || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [batchId]);

  const handleApprove = async (id: number) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await worldStocksAPI.approvePendingTransaction(id);
      await loadTransactions();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to approve transaction");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Are you sure you want to reject this transaction?")) return;

    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await worldStocksAPI.rejectPendingTransaction(id);
      await loadTransactions();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to reject transaction");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleApproveAll = async () => {
    // Use provided batchId or extract from first transaction
    const effectiveBatchId = batchId || (transactions.length > 0 ? transactions[0].upload_batch_id : null);
    
    if (!effectiveBatchId) {
      setError("No batch ID available");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to approve all ${transactions.length} transactions?`
      )
    )
      return;

    try {
      setLoading(true);
      await worldStocksAPI.batchApprovePendingTransactions(effectiveBatchId);
      await loadTransactions();
      if (onApprovalComplete) {
        onApprovalComplete(effectiveBatchId);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to approve all transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAll = async () => {
    if (
      !confirm(
        `Are you sure you want to reject all ${transactions.length} transactions? This action cannot be undone.`
      )
    )
      return;

    setLoading(true);
    const failedIds: number[] = [];

    for (const transaction of transactions) {
      try {
        await worldStocksAPI.rejectPendingTransaction(transaction.id);
      } catch (err) {
        failedIds.push(transaction.id);
      }
    }

    if (failedIds.length > 0) {
      setError(`Failed to reject ${failedIds.length} transactions`);
    }

    await loadTransactions();
    setLoading(false);
  };

  const startEdit = (transaction: PendingWorldTransaction) => {
    setEditingId(transaction.id);
    setEditData({
      transaction_date: transaction.transaction_date,
      transaction_time: transaction.transaction_time || "",
      ticker: transaction.ticker,
      stock_name: transaction.stock_name,
      transaction_type: transaction.transaction_type,
      quantity: transaction.quantity,
      price: transaction.price,
      amount: transaction.amount,
      commission: transaction.commission,
      tax: transaction.tax,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id: number) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await worldStocksAPI.updatePendingTransaction(id, editData);
      setEditingId(null);
      setEditData({});
      await loadTransactions();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update transaction");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "BUY":
        return "text-gain bg-gain/10";
      case "SELL":
        return "text-loss bg-loss/10";
      case "DIVIDEND":
        return "text-brand-400 bg-brand-400/10";
      case "DEPOSIT":
        return "text-purple-400 bg-purple-400/10";
      case "WITHDRAWAL":
        return "text-orange-400 bg-orange-400/10";
      default:
        return "text-gray-300 bg-surface-dark";
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-surface-dark border border-white/10 rounded-xl p-8 text-center">
        <p className="text-gray-400">No pending world stock transactions to review</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-100">
          Review World Stock Transactions ({transactions.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleRejectAll}
            disabled={loading}
            className="bg-loss/20 text-loss px-4 py-2 rounded-xl hover:bg-loss/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject All
          </button>
          <button
            onClick={handleApproveAll}
            disabled={loading}
            className="bg-gain/20 text-gain px-4 py-2 rounded-xl hover:bg-gain/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Approve All
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-loss/10 border border-loss/20 rounded-xl p-4">
          <p className="text-sm text-loss">{error}</p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-surface-dark-secondary rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-surface-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tax
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface-dark-secondary divide-y divide-white/5">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-white/5">
                  {editingId === transaction.id ? (
                    <>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={editData.transaction_date || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              transaction_date: e.target.value,
                            })
                          }
                          className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-sm w-24 text-gray-100"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-100">
                            {editData.stock_name || transaction.stock_name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {editData.ticker || transaction.ticker}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={editData.transaction_type || "BUY"}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              transaction_type: e.target.value,
                            })
                          }
                          className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-sm w-24 text-gray-100"
                        >
                          <option value="BUY">BUY</option>
                          <option value="SELL">SELL</option>
                          <option value="DIVIDEND">DIVIDEND</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editData.quantity || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              quantity: parseFloat(e.target.value) || null,
                            })
                          }
                          className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-sm w-20 text-right text-gray-100"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editData.price || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              price: parseFloat(e.target.value) || null,
                            })
                          }
                          className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-sm w-20 text-right text-gray-100"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editData.amount || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              amount: parseFloat(e.target.value) || null,
                            })
                          }
                          className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-sm w-20 text-right text-gray-100"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editData.commission || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              commission: parseFloat(e.target.value) || null,
                            })
                          }
                          className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-sm w-16 text-right text-gray-100"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editData.tax || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              tax: parseFloat(e.target.value) || null,
                            })
                          }
                          className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-sm w-16 text-right text-gray-100"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => saveEdit(transaction.id)}
                            disabled={processingIds.has(transaction.id)}
                            className="text-gain hover:text-gain disabled:opacity-50"
                            title="Save"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={processingIds.has(transaction.id)}
                            className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                        {transaction.transaction_date}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-100">
                            {transaction.stock_name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {transaction.ticker}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTransactionTypeColor(
                            transaction.transaction_type
                          )}`}
                        >
                          {transaction.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-100">
                        {transaction.quantity !== null
                          ? transaction.quantity.toFixed(2)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-100">
                        {transaction.price !== null
                          ? `$${transaction.price.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-100">
                        {transaction.amount !== null
                          ? `$${transaction.amount.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-400">
                        {transaction.commission !== null
                          ? `$${transaction.commission.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-400">
                        {transaction.tax !== null
                          ? `$${transaction.tax.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => startEdit(transaction)}
                            disabled={processingIds.has(transaction.id)}
                            className="text-brand-400 hover:text-brand-500 disabled:opacity-50"
                            title="Edit"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleApprove(transaction.id)}
                            disabled={processingIds.has(transaction.id)}
                            className="text-gain hover:text-gain disabled:opacity-50"
                            title="Approve"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReject(transaction.id)}
                            disabled={processingIds.has(transaction.id)}
                            className="text-loss hover:text-loss disabled:opacity-50"
                            title="Reject"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-brand-400/10 border border-brand-400/20 rounded-xl p-4">
        <p className="text-sm text-brand-400">
          <strong>Tip:</strong> Review each transaction carefully. You can edit
          any field by clicking the pencil icon. Click the checkmark to approve
          or X to reject individual transactions, or use the buttons above for
          batch operations.
        </p>
      </div>
    </div>
  );
}
