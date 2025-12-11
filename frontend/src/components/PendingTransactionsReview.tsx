"use client";

import React, { useState, useEffect } from "react";
import { israeliStocksAPI } from "@/services/api";
import { CheckIcon, XMarkIcon, PencilIcon } from "@heroicons/react/24/outline";

interface PendingTransaction {
  id: number;
  upload_batch_id: string;
  pdf_filename: string;
  transaction_date: string;
  security_no: string;
  stock_name: string;
  transaction_type: string;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  currency: string;
  status: string;
  review_notes: string | null;
  created_at: string;
}

interface PendingTransactionsReviewProps {
  batchId?: string;
  onApprovalComplete?: () => void;
}

export default function PendingTransactionsReview({
  batchId,
  onApprovalComplete,
}: PendingTransactionsReviewProps) {
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await israeliStocksAPI.getPendingTransactions(
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
      await israeliStocksAPI.approvePendingTransaction(id);
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
      await israeliStocksAPI.rejectPendingTransaction(id);
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
    if (!batchId) {
      setError("No batch ID provided");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to approve all ${transactions.length} transaction(s)?`
      )
    )
      return;

    try {
      setLoading(true);
      await israeliStocksAPI.approveAllInBatch(batchId);
      await loadTransactions();
      if (onApprovalComplete) onApprovalComplete();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to approve all transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAll = async () => {
    if (!batchId) {
      setError("No batch ID provided");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to reject all ${transactions.length} transaction(s)? This cannot be undone.`
      )
    )
      return;

    try {
      setLoading(true);
      await israeliStocksAPI.rejectAllInBatch(batchId);
      await loadTransactions();
      if (onApprovalComplete) onApprovalComplete();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to reject all transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: PendingTransaction) => {
    setEditingId(transaction.id);
    setEditData({
      transaction_date: transaction.transaction_date || "",
      security_no: transaction.security_no,
      stock_name: transaction.stock_name || "",
      transaction_type: transaction.transaction_type || "BUY",
      quantity: transaction.quantity ?? "",
      price: transaction.price ?? "",
      amount: transaction.amount ?? "",
      currency: transaction.currency || "ILS",
      review_notes: transaction.review_notes || "",
    });
  };

  const handleSaveEdit = async (id: number) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await israeliStocksAPI.updatePendingTransaction(id, editData);
      setEditingId(null);
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

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "BUY":
        return "text-green-700 bg-green-100";
      case "SELL":
        return "text-red-700 bg-red-100";
      case "DIVIDEND":
        return "text-blue-700 bg-blue-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">No pending transactions to review</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Review Pending Transactions ({transactions.length})
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
                            {editData.security_no || transaction.security_no}
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
                          className="border rounded px-2 py-1 text-sm w-16 text-gray-900"
                        >
                          <option value="BUY">BUY</option>
                          <option value="SELL">SELL</option>
                          <option value="DIVIDEND">DIVIDEND</option>
                        </select>
                      </td>
                      <td className="px-6py-4">
                        <input
                          type="number"
                          value={editData.quantity ?? ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              quantity: parseFloat(e.target.value) || null,
                            })
                          }
                          className="border rounded py-1 text-sm w-16 text-center text-gray-900"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          step="0.01"
                          value={editData.price ?? ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              price: parseFloat(e.target.value) || null,
                            })
                          }
                          className="border rounded px-2 py-1 text-sm w-28 text-right text-gray-900"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          step="0.01"
                          value={editData.amount ?? ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              amount: parseFloat(e.target.value) || null,
                            })
                          }
                          className="border rounded px-2 py-1 text-sm w-28 text-right text-gray-900"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleSaveEdit(transaction.id)}
                          disabled={processingIds.has(transaction.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.transaction_date || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">
                          {transaction.stock_name}
                        </div>
                        <div className="text-gray-500">
                          {transaction.security_no}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(
                            transaction.transaction_type
                          )}`}
                        >
                          {transaction.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {transaction.quantity
                          ? transaction.quantity.toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {transaction.price
                          ? `${transaction.currency} ${transaction.price.toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {transaction.amount
                          ? `${transaction.currency} ${transaction.amount.toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleEdit(transaction)}
                          disabled={processingIds.has(transaction.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleApprove(transaction.id)}
                          disabled={processingIds.has(transaction.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Approve"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReject(transaction.id)}
                          disabled={processingIds.has(transaction.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Reject"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
