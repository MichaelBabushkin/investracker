"use client";

import React, { useState } from "react";
import {
  PlayIcon,
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const JobsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "scheduled" | "manual" | "cache" | "history"
  >("manual");

  const tabs = [
    { id: "scheduled" as const, name: "Scheduled Jobs" },
    { id: "manual" as const, name: "Manual Tasks" },
    { id: "cache" as const, name: "Cache Management" },
    { id: "history" as const, name: "Job History" },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Jobs & Tasks</h2>
        <p className="text-sm text-gray-600 mt-1">
          Run scheduled jobs, manual tasks, and manage system operations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === "manual" && (
          <div className="space-y-4">
            {/* Manual Task Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stock Data Sync */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ArrowPathIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Sync Stock Data
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last run: Never
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Fetch latest stock prices and market data from external APIs
                </p>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <PlayIcon className="w-4 h-4" />
                  Run Now
                </button>
              </div>

              {/* Clear Cache */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <TrashIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Clear Application Cache
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last cleared: Never
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Clear all cached data including Redis cache and temporary files
                </p>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                  Clear Cache
                </button>
              </div>

              {/* Recalculate Portfolios */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ArrowPathIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Recalculate Portfolios
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last run: Never
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Recalculate all user portfolio values and performance metrics
                </p>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <PlayIcon className="w-4 h-4" />
                  Run Now
                </button>
              </div>

              {/* Database Maintenance */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <ClockIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Database Maintenance
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last run: Never
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Run VACUUM and ANALYZE on database tables for optimization
                </p>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  <PlayIcon className="w-4 h-4" />
                  Run Now
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "scheduled" && (
          <div className="text-center py-12 text-gray-500">
            Scheduled jobs management interface coming soon
          </div>
        )}

        {activeTab === "cache" && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> Clearing cache may temporarily impact
                application performance while data is re-cached.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Redis Cache
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Session data and API responses
                </p>
                <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Clear Redis
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2">
                  File Cache
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Temporary files and uploads
                </p>
                <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Clear Files
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2">
                  All Caches
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Clear everything at once
                </p>
                <button className="w-full px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors">
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="text-center py-12 text-gray-500">
            Job execution history coming soon
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsSection;
