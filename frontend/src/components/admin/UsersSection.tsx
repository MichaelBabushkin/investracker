"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { adminAPI } from "@/services/api";

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

const UsersSection: React.FC = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [resetEmail, setResetEmail] = useState(currentUser?.email || "");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleResetStockData = async () => {
    if (!resetEmail || !resetEmail.includes("@")) {
      setResetResult({
        success: false,
        message: "Please enter a valid email address",
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ALL Israeli stock data for ${resetEmail}?\n\nThis will delete:\n- All holdings\n- All transactions\n- All dividends\n\nThis action cannot be undone!`
    );

    if (!confirmed) return;

    setResetting(true);
    setResetResult(null);

    try {
      const result = await adminAPI.resetUserStockData(resetEmail);
      setResetResult({
        success: true,
        message: `Successfully deleted ${result.deleted.total} records (${result.deleted.holdings} holdings, ${result.deleted.transactions} transactions, ${result.deleted.dividends} dividends)`,
      });
    } catch (error: any) {
      setResetResult({
        success: false,
        message:
          error.response?.data?.detail || "Failed to reset stock data",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <UserPlusIcon className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Reset User Data Section */}
      <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <TrashIcon className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reset User Stock Data
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Delete all Israeli stock data (holdings, transactions, dividends) for a specific user. 
              This is useful for development and testing. User account will NOT be deleted.
            </p>
            
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={resetting}
                />
              </div>
              <button
                onClick={handleResetStockData}
                disabled={resetting || !resetEmail}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {resetting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4" />
                    Reset Data
                  </>
                )}
              </button>
            </div>

            {resetResult && (
              <div
                className={`mt-4 p-4 rounded-lg ${
                  resetResult.success
                    ? "bg-green-100 border border-green-300 text-green-800"
                    : "bg-red-100 border border-red-300 text-red-800"
                }`}
              >
                <p className="text-sm font-medium">{resetResult.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="viewer">Viewer</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <FunnelIcon className="w-5 h-5" />
          More Filters
        </button>
      </div>

      {/* Users Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                User management interface will be implemented here
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersSection;
