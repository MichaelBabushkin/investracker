"use client";

import React, { useState } from "react";
import { adminAPI } from "@/services/api";
import {
  Play,
  Clock,
  Trash2,
  RefreshCw,
  Calendar,
} from "lucide-react";

const JobsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "scheduled" | "manual" | "cache" | "history"
  >("manual");
  const [selectedMarket, setSelectedMarket] = useState<string>("US");
  const [seedingCalendar, setSeedingCalendar] = useState<boolean>(false);
  const [seedMessage, setSeedMessage] = useState<string>("");
  const [runningMigrations, setRunningMigrations] = useState<boolean>(false);
  const [migrationMessage, setMigrationMessage] = useState<string>("");

  const handleSeedCalendar = async () => {
    setSeedingCalendar(true);
    setSeedMessage("");
    
    try {
      const data = await adminAPI.seedCalendarEvents(selectedMarket);
      setSeedMessage(
        `✓ Successfully seeded ${data.events_created} events for ${data.market} market (${data.years.join(", ")})`
      );
    } catch (error) {
      setSeedMessage(`✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSeedingCalendar(false);
    }
  };

  const handleRunMigrations = async () => {
    setRunningMigrations(true);
    setMigrationMessage("");
    
    try {
      const data = await adminAPI.runMigrations();
      if (data.success) {
        setMigrationMessage(`✓ Migrations completed successfully`);
      } else {
        setMigrationMessage(`✗ Error: ${data.message || "Failed to run migrations"}\n${data.stderr || ""}`);
      }
    } catch (error) {
      setMigrationMessage(`✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setRunningMigrations(false);
    }
  };

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
        <h2 className="text-2xl font-bold text-gray-100">Jobs & Tasks</h2>
        <p className="text-sm text-gray-400 mt-1">
          Run scheduled jobs, manual tasks, and manage system operations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-brand-400 text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/10"
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
              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-400/10 rounded-lg">
                      <RefreshCw className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">
                        Sync Stock Data
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last run: Never
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Fetch latest stock prices and market data from external APIs
                </p>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-400 text-surface-dark rounded-xl hover:bg-brand-500 transition-colors">
                  <Play className="w-4 h-4" />
                  Run Now
                </button>
              </div>

              {/* Clear Cache */}
              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-loss/10 rounded-lg">
                      <Trash2 className="w-5 h-5 text-loss" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">
                        Clear Application Cache
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last cleared: Never
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Clear all cached data including Redis cache and temporary files
                </p>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-loss text-white rounded-xl hover:bg-loss/80 transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Clear Cache
                </button>
              </div>

              {/* Recalculate Portfolios */}
              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gain/10 rounded-lg">
                      <RefreshCw className="w-5 h-5 text-gain" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">
                        Recalculate Portfolios
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last run: Never
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Recalculate all user portfolio values and performance metrics
                </p>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gain text-surface-dark rounded-xl hover:bg-gain/80 transition-colors">
                  <Play className="w-4 h-4" />
                  Run Now
                </button>
              </div>

              {/* Database Maintenance */}
              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Clock className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">
                        Database Maintenance
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last run: Never
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Run VACUUM and ANALYZE on database tables for optimization
                </p>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
                  <Play className="w-4 h-4" />
                  Run Now
                </button>
              </div>

              {/* Seed Calendar Events */}
              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-400/10 rounded-lg">
                      <Calendar className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">
                        Seed Calendar Events
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Market holidays & closures
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Populate calendar with market holidays and closures
                </p>
                <select
                  value={selectedMarket}
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  className="w-full mb-3 px-3 py-2 bg-surface-dark border border-white/10 rounded-xl text-sm text-gray-100 focus:ring-2 focus:ring-brand-400/40 focus:border-transparent"
                  disabled={seedingCalendar}
                >
                  <option value="US">US Market</option>
                  <option value="IL">Israeli Market</option>
                </select>
                {seedMessage && (
                  <div
                    className={`mb-3 p-2 rounded text-xs ${
                      seedMessage.startsWith("✓")
                        ? "bg-gain/10 text-gain"
                        : "bg-loss/10 text-loss"
                    }`}
                  >
                    {seedMessage}
                  </div>
                )}
                <button
                  onClick={handleSeedCalendar}
                  disabled={seedingCalendar}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-400 text-surface-dark rounded-xl hover:bg-brand-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  {seedingCalendar ? "Seeding..." : "Seed Calendar"}
                </button>
              </div>

              {/* Run Migrations */}
              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-400/10 rounded-lg">
                      <RefreshCw className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">
                        Run Database Migrations
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Apply pending migrations
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Manually trigger Alembic migrations to create/update database tables
                </p>
                {migrationMessage && (
                  <div
                    className={`mb-3 p-2 rounded text-xs font-mono whitespace-pre-wrap ${
                      migrationMessage.startsWith("✓")
                        ? "bg-gain/10 text-gain"
                        : "bg-loss/10 text-loss"
                    }`}
                  >
                    {migrationMessage}
                  </div>
                )}
                <button
                  onClick={handleRunMigrations}
                  disabled={runningMigrations}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-400 text-surface-dark rounded-xl hover:bg-brand-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  {runningMigrations ? "Running..." : "Run Migrations"}
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
            <div className="bg-warn/10 border border-warn/20 rounded-xl p-4">
              <p className="text-sm text-warn">
                <strong>Warning:</strong> Clearing cache may temporarily impact
                application performance while data is re-cached.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold text-gray-100 mb-2">
                  Redis Cache
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Session data and API responses
                </p>
                <button className="w-full px-4 py-2 bg-loss text-white rounded-xl hover:bg-loss/80 transition-colors">
                  Clear Redis
                </button>
              </div>

              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold text-gray-100 mb-2">
                  File Cache
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Temporary files and uploads
                </p>
                <button className="w-full px-4 py-2 bg-loss text-white rounded-xl hover:bg-loss/80 transition-colors">
                  Clear Files
                </button>
              </div>

              <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold text-gray-100 mb-2">
                  All Caches
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Clear everything at once
                </p>
                <button className="w-full px-4 py-2 bg-red-700 text-white rounded-xl hover:bg-red-800 transition-colors">
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
