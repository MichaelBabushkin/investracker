"use client";

import React, { useState, useEffect } from "react";
import { worldStocksAPI } from "@/services/api";
import { CheckIcon, XMarkIcon, PencilIcon } from "@heroicons/react/24/outline";

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
        return "text-green-700 bg-green-100";
      case "SELL":
        return "text-red-700 bg-red-100";
      case "DIVIDEND":
        return "text-blue-700 bg-blue-100";
      case "DEPOSIT":
        return "text-purple-700 bg-purple-100";
      case "WITHDRAWAL":
        return "text-orange-700 bg-orange-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">No pending world stock transactions to review</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Review World Stock Transactions ({transactions.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleRejectAll}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject All
          </button>
          <button
            onClick={handleApproveAll}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Approve All
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
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
                          className="border rounded px-2 py-1 text-sm w-24 text-gray-900"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {editData.stock_name || transaction.stock_name}
                          </div>
                          <div className="text-xs text-gray-500">
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
                          className="border rounded px-2 py-1 text-sm w-24 text-gray-900"
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
                          className="border rounded px-2 py-1 text-sm w-20 text-right text-gray-900"
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
                          className="border rounded px-2 py-1 text-sm w-20 text-right text-gray-900"
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
                          className="border rounded px-2 py-1 text-sm w-20 text-right text-gray-900"
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
                          className="border rounded px-2 py-1 text-sm w-16 text-right text-gray-900"
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
                          className="border rounded px-2 py-1 text-sm w-16 text-right text-gray-900"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => saveEdit(transaction.id)}
                            disabled={processingIds.has(transaction.id)}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Save"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={processingIds.has(transaction.id)}
                            className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            title="Cancel"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.transaction_date}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.stock_name}
                          </div>
                          <div className="text-xs text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {transaction.quantity !== null
                          ? transaction.quantity.toFixed(2)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {transaction.price !== null
                          ? `$${transaction.price.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {transaction.amount !== null
                          ? `$${transaction.amount.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {transaction.commission !== null
                          ? `$${transaction.commission.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {transaction.tax !== null
                          ? `$${transaction.tax.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => startEdit(transaction)}
                            disabled={processingIds.has(transaction.id)}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleApprove(transaction.id)}
                            disabled={processingIds.has(transaction.id)}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReject(transaction.id)}
                            disabled={processingIds.has(transaction.id)}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Reject"
                          >
                            <XMarkIcon className="h-5 w-5" />
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Review each transaction carefully. You can edit
          any field by clicking the pencil icon. Click the checkmark to approve
          or X to reject individual transactions, or use the buttons above for
          batch operations.
        </p>
      </div>
    </div>
  );
}
