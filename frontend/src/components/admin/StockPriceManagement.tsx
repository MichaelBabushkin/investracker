"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { adminAPI } from "@/services/api";
import toast from "react-hot-toast";

interface MarketStats {
  total_stocks: number;
  stocks_with_price: number;
  stocks_without_price: number;
  fresh_15_minutes: number;
  fresh_1_hour: number;
  fresh_24_hours: number;
  stale_24_hours: number;
  in_holdings: number;
  oldest_update: string | null;
  newest_update: string | null;
}

interface DetailedStats {
  world: MarketStats;
  israeli: MarketStats;
}

const StockPriceManagement: React.FC = () => {
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState<{
    active?: boolean;
    world?: boolean;
    israeli?: boolean;
    catalog?: boolean;
  }>({});
  const [singleTicker, setSingleTicker] = useState("");
  const [singleMarket, setSingleMarket] = useState<"world" | "israeli">("world");

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getPriceStatsDetailed();
      setStats(response);
    } catch {
      // Failed to fetch price stats
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshActive = async () => {
    setRefreshing({ ...refreshing, active: true });
    const loadingToast = toast.loading("Refreshing active holdings prices...");

    try {
      const result = await adminAPI.refreshActivePrices();
      toast.success(
        `Updated ${result.updated} stock prices! Recalculated ${result.holdings_recalculated} holdings.`,
        { id: loadingToast }
      );
      await fetchStats();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Failed to refresh prices",
        { id: loadingToast }
      );
    } finally {
      setRefreshing({ ...refreshing, active: false });
    }
  };

  const handleRefreshMarket = async (market: "world" | "israeli", limit: number = 100) => {
    setRefreshing({ ...refreshing, [market]: true });
    const loadingToast = toast.loading(`Refreshing ${market} stock prices...`);

    try {
      const result = await adminAPI.refreshMarketPrices(market, limit);
      toast.success(
        `Updated ${result.updated} ${market} stock prices! (${result.failed} failed)`,
        { id: loadingToast }
      );
      await fetchStats();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Failed to refresh prices",
        { id: loadingToast }
      );
    } finally {
      setRefreshing({ ...refreshing, [market]: false });
    }
  };

  const handleRefreshCatalog = async () => {
    setRefreshing({ ...refreshing, catalog: true });
    const loadingToast = toast.loading("Refreshing catalog prices...");

    try {
      const result = await adminAPI.refreshCatalogPrices(500);
      toast.success(
        `Updated ${result.updated} stock prices! (${result.failed} failed)`,
        { id: loadingToast }
      );
      await fetchStats();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Failed to refresh prices",
        { id: loadingToast }
      );
    } finally {
      setRefreshing({ ...refreshing, catalog: false });
    }
  };

  const handleRefreshSingle = async () => {
    if (!singleTicker.trim()) {
      toast.error("Please enter a ticker symbol");
      return;
    }

    const loadingToast = toast.loading(`Refreshing ${singleTicker}...`);

    try {
      const result = await adminAPI.refreshSinglePrice(
        singleTicker.trim().toUpperCase(),
        singleMarket
      );
      if (result.success) {
        toast.success(`Successfully updated ${singleTicker}`, { id: loadingToast });
        setSingleTicker("");
        await fetchStats();
      } else {
        toast.error(result.error || "Failed to update", { id: loadingToast });
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Failed to refresh price",
        { id: loadingToast }
      );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const getFreshnessColor = (fresh: number, total: number) => {
    const percentage = total > 0 ? (fresh / total) * 100 : 0;
    if (percentage >= 80) return "text-gain";
    if (percentage >= 50) return "text-warn";
    return "text-loss";
  };

  const renderMarketStats = (market: "world" | "israeli", data: MarketStats) => {
    const freshnessPercentage = data.total_stocks > 0
      ? Math.round((data.fresh_24_hours / data.total_stocks) * 100)
      : 0;

    return (
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-100 capitalize">
            {market} Stocks
          </h3>
          <button
            onClick={() => handleRefreshMarket(market, 100)}
            disabled={refreshing[market]}
            className="flex items-center gap-2 px-4 py-2 bg-brand-400 text-surface-dark text-sm rounded-xl hover:bg-brand-500 transition-colors disabled:bg-gray-600"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing[market] ? "animate-spin" : ""}`}
            />
            Refresh {market === "world" ? "World" : "Israeli"} (100)
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-surface-dark rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-100">
              {data.total_stocks}
            </div>
            <div className="text-sm text-gray-400">Total Stocks</div>
          </div>

          <div className="bg-surface-dark rounded-xl p-4">
            <div className="text-2xl font-bold text-brand-400">
              {data.stocks_with_price}
            </div>
            <div className="text-sm text-gray-400">With Prices</div>
          </div>

          <div className="bg-surface-dark rounded-xl p-4">
            <div className="text-2xl font-bold text-gain">
              {data.in_holdings}
            </div>
            <div className="text-sm text-gray-400">In Holdings</div>
          </div>

          <div className="bg-surface-dark rounded-xl p-4">
            <div
              className={`text-2xl font-bold ${getFreshnessColor(
                data.fresh_24_hours,
                data.total_stocks
              )}`}
            >
              {freshnessPercentage}%
            </div>
            <div className="text-sm text-gray-400">Fresh (24h)</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-sm text-gray-400">Fresh (15 min)</span>
            <span className="font-semibold text-gray-100">
              {data.fresh_15_minutes} / {data.total_stocks}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-sm text-gray-400">Fresh (1 hour)</span>
            <span className="font-semibold text-gray-100">
              {data.fresh_1_hour} / {data.total_stocks}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-sm text-gray-400">Fresh (24 hours)</span>
            <span className="font-semibold text-gray-100">
              {data.fresh_24_hours} / {data.total_stocks}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-sm text-gray-400">Stale (&gt;24h)</span>
            <span className="font-semibold text-loss">
              {data.stale_24_hours}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-sm text-gray-400">Oldest Update</span>
            <span className="font-semibold text-gray-100">
              {formatDate(data.oldest_update)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-sm text-gray-400">Newest Update</span>
            <span className="font-semibold text-gray-100">
              {formatDate(data.newest_update)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Stock Price Management</h2>
          <p className="text-sm text-gray-400 mt-1">
            Monitor and refresh real-time stock prices
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-surface-dark text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Refresh Active Holdings */}
        <div className="bg-gain/10 border border-gain/20 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">
                Active Holdings
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Update prices for stocks in user portfolios
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-gain" />
          </div>
          <button
            onClick={handleRefreshActive}
            disabled={refreshing.active}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gain text-surface-dark rounded-xl hover:bg-gain/80 transition-colors disabled:bg-gray-600 font-medium"
          >
            {refreshing.active ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Refresh Active Prices
              </>
            )}
          </button>
        </div>

        {/* Refresh Catalog */}
        <div className="bg-brand-400/10 border border-brand-400/20 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">
                Catalog Stocks
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Update stale prices (&gt;24h old, up to 500 stocks)
              </p>
            </div>
            <Clock className="w-6 h-6 text-brand-400" />
          </div>
          <button
            onClick={handleRefreshCatalog}
            disabled={refreshing.catalog}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-400 text-surface-dark rounded-xl hover:bg-brand-500 transition-colors disabled:bg-gray-600 font-medium"
          >
            {refreshing.catalog ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Refresh Catalog (500)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Single Stock Refresh */}
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Refresh Single Stock
        </h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Enter ticker (e.g., AAPL)"
            value={singleTicker}
            onChange={(e) => setSingleTicker(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleRefreshSingle()}
            className="flex-1 px-4 py-2 bg-surface-dark border border-white/10 rounded-xl text-gray-100 focus:ring-2 focus:ring-brand-400/40 focus:border-transparent"
          />
          <select
            value={singleMarket}
            onChange={(e) => setSingleMarket(e.target.value as "world" | "israeli")}
            className="px-4 py-2 bg-surface-dark border border-white/10 rounded-xl text-gray-100 focus:ring-2 focus:ring-brand-400/40 focus:border-transparent"
          >
            <option value="world">World</option>
            <option value="israeli">Israeli</option>
          </select>
          <button
            onClick={handleRefreshSingle}
            disabled={!singleTicker.trim()}
            className="px-6 py-2 bg-brand-400 text-surface-dark rounded-xl hover:bg-brand-500 transition-colors disabled:bg-gray-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Market Statistics */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderMarketStats("world", stats.world)}
          {renderMarketStats("israeli", stats.israeli)}
        </div>
      )}

      {!stats && (
        <div className="text-center py-12 text-gray-500">
          Loading statistics...
        </div>
      )}
    </div>
  );
};

export default StockPriceManagement;
