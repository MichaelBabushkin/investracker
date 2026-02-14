"use client";

import { useState, useEffect } from "react";
import {
  SwatchIcon,
  CurrencyDollarIcon,
  BellIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import ProtectedRoute from "@/components/ProtectedRoute";
import { userSettingsAPI } from "@/services/api";

type Theme = "light" | "dark" | "auto";
type Currency = "USD" | "ILS" | "EUR" | "GBP";

interface CalendarPreferences {
  notify_markets: string[];
  notify_event_types: string[];
  notify_days_before: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>("appearance");
  const [theme, setTheme] = useState<Theme>("light");
  const [baseCurrency, setBaseCurrency] = useState<Currency>("USD");
  const [notifications, setNotifications] = useState({
    email: true,
    transactions: true,
    portfolio: false,
    reports: true,
  });
  const [calendarPreferences, setCalendarPreferences] = useState<CalendarPreferences>({
    notify_markets: ["US", "IL"],
    notify_event_types: [
      "MARKET_CLOSED",
      "EARLY_CLOSE",
      "EARNINGS",
      "ECONOMIC_DATA",
      "FOMC",
      "HOLIDAY"
    ],
    notify_days_before: 1,
  });
  const [loadingCalendarPrefs, setLoadingCalendarPrefs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme;
    const savedCurrency = localStorage.getItem("baseCurrency") as Currency;
    
    if (savedTheme) setTheme(savedTheme);
    if (savedCurrency) setBaseCurrency(savedCurrency);

    // Load calendar notification preferences
    loadCalendarPreferences();
  }, []);

  const loadCalendarPreferences = async () => {
    try {
      const data = await userSettingsAPI.getNotificationPreferences();
      setCalendarPreferences({
        notify_markets: data.notify_markets || ["US", "IL"],
        notify_event_types: data.notify_event_types || [
          "MARKET_CLOSED",
          "EARLY_CLOSE",
          "EARNINGS",
          "ECONOMIC_DATA",
          "FOMC",
          "HOLIDAY"
        ],
        notify_days_before: data.notify_days_before || 1,
      });
    } catch {
      // Silently fail — user may not have preferences yet
    }
  };

  const handleSaveCalendarPreferences = async () => {
    setLoadingCalendarPrefs(true);
    try {
      await userSettingsAPI.updateNotificationPreferences(calendarPreferences);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // Save failed silently
    } finally {
      setLoadingCalendarPrefs(false);
    }
  };

  const toggleMarket = (market: string) => {
    setCalendarPreferences((prev) => ({
      ...prev,
      notify_markets: prev.notify_markets.includes(market)
        ? prev.notify_markets.filter((m) => m !== market)
        : [...prev.notify_markets, market],
    }));
  };

  const toggleEventType = (eventType: string) => {
    setCalendarPreferences((prev) => ({
      ...prev,
      notify_event_types: prev.notify_event_types.includes(eventType)
        ? prev.notify_event_types.filter((e) => e !== eventType)
        : [...prev.notify_event_types, eventType],
    }));
  };

  const handleSaveSettings = () => {
    // Save to localStorage (in a real app, this would sync to backend)
    localStorage.setItem("theme", theme);
    localStorage.setItem("baseCurrency", baseCurrency);
    
    // Apply theme
    applyTheme(theme);
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const applyTheme = (selectedTheme: Theme) => {
    if (selectedTheme === "dark" || (selectedTheme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const tabs = [
    { id: "appearance", name: "Appearance", icon: SwatchIcon },
    { id: "preferences", name: "Preferences", icon: UserCircleIcon },
    { id: "notifications", name: "Notifications", icon: BellIcon },
    { id: "security", name: "Security", icon: ShieldCheckIcon },
    { id: "regional", name: "Regional", icon: GlobeAltIcon },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              ✓ Settings saved successfully!
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Mobile Tab Selector */}
          <div className="lg:hidden bg-white rounded-lg shadow p-2">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 bg-white rounded-lg shadow p-4 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow">
            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  Appearance
                </h2>

                {/* Theme Selection */}
                <div className="mb-6 sm:mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Color Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {[
                      { value: "light", label: "Light", emoji: "☀️" },
                      { value: "dark", label: "Dark", emoji: "🌙" },
                      { value: "auto", label: "Auto", emoji: "🔄" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as Theme)}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          theme === option.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-3xl sm:text-4xl mb-2">{option.emoji}</div>
                        <div className="text-sm sm:text-base font-medium text-gray-900">
                          {option.label}
                        </div>
                        {option.value === "auto" && (
                          <div className="text-xs text-gray-500 mt-1">
                            System
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Accent (Future Feature) */}
                <div className="mb-6 sm:mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Accent Color
                  </label>
                  <div className="flex gap-3 sm:gap-4">
                    {["blue", "green", "purple", "red", "orange"].map(
                      (color) => (
                        <button
                          key={color}
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 ${
                            color === "blue"
                              ? "bg-blue-500 border-blue-700"
                              : color === "green"
                              ? "bg-green-500 border-green-700"
                              : color === "purple"
                              ? "bg-purple-500 border-purple-700"
                              : color === "red"
                              ? "bg-red-500 border-red-700"
                              : "bg-orange-500 border-orange-700"
                          }`}
                          title={color}
                        />
                      )
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Coming soon - customize accent colors
                  </p>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  Preferences
                </h2>

                <div className="space-y-6">
                  {/* Base Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Currency
                    </label>
                    <select
                      value={baseCurrency}
                      onChange={(e) => setBaseCurrency(e.target.value as Currency)}
                      className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="ILS">ILS (₪) - Israeli Shekel</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Default currency for displaying values
                    </p>
                  </div>

                  {/* Risk Tolerance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investment Risk Tolerance
                    </label>
                    <select className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="conservative">Conservative</option>
                      <option value="moderate">Moderate</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                  </div>

                  {/* Date Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  Notifications
                </h2>

                {/* General Notifications */}
                <div className="mb-8">
                  <h3 className="text-base font-medium text-gray-900 mb-4">
                    General Notifications
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        key: "email",
                        label: "Email Notifications",
                        description: "Receive updates via email",
                      },
                      {
                        key: "transactions",
                        label: "Transaction Alerts",
                        description: "Get notified when transactions are processed",
                      },
                      {
                        key: "portfolio",
                        label: "Portfolio Updates",
                        description: "Daily portfolio performance summaries",
                      },
                      {
                        key: "reports",
                        label: "Report Processing",
                        description: "Alerts when PDF reports are processed",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between py-4 border-b border-gray-200"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.description}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setNotifications({
                              ...notifications,
                              [item.key]: !notifications[item.key as keyof typeof notifications],
                            })
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications[item.key as keyof typeof notifications]
                              ? "bg-blue-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notifications[item.key as keyof typeof notifications]
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calendar Event Notifications */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-base font-medium text-gray-900 mb-4">
                    Calendar Event Notifications
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Choose which market events you want to be notified about
                  </p>

                  {/* Markets Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Markets
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: "US", label: "US Market" },
                        { value: "IL", label: "Israeli Market" },
                      ].map((market) => (
                        <button
                          key={market.value}
                          onClick={() => toggleMarket(market.value)}
                          className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                            calendarPreferences.notify_markets.includes(market.value)
                              ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          {calendarPreferences.notify_markets.includes(market.value) && "✓ "}
                          {market.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Event Types Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Event Types
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { value: "MARKET_CLOSED", label: "Market Closures" },
                        { value: "EARLY_CLOSE", label: "Early Close" },
                        { value: "EARNINGS", label: "Earnings Reports" },
                        { value: "ECONOMIC_DATA", label: "Economic Data" },
                        { value: "FOMC", label: "FOMC Meetings" },
                        { value: "HOLIDAY", label: "Holidays" },
                      ].map((eventType) => (
                        <button
                          key={eventType.value}
                          onClick={() => toggleEventType(eventType.value)}
                          className={`px-4 py-2 rounded-lg border-2 text-left transition-colors ${
                            calendarPreferences.notify_event_types.includes(eventType.value)
                              ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          {calendarPreferences.notify_event_types.includes(eventType.value) && "✓ "}
                          {eventType.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Days Before Notification */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notify me this many days before events
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={calendarPreferences.notify_days_before}
                      onChange={(e) =>
                        setCalendarPreferences((prev) => ({
                          ...prev,
                          notify_days_before: Math.max(0, Math.min(30, parseInt(e.target.value) || 1)),
                        }))
                      }
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Between 0-30 days (1 = notify one day before)
                    </p>
                  </div>

                  {/* Save Calendar Preferences Button */}
                  <button
                    onClick={handleSaveCalendarPreferences}
                    disabled={loadingCalendarPrefs}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loadingCalendarPrefs ? "Saving..." : "Save Calendar Preferences"}
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  Security
                </h2>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">
                      Change Password
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Update your password to keep your account secure
                    </p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Update Password
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">
                      Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add an extra layer of security to your account
                    </p>
                    <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                      Enable 2FA (Coming Soon)
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">
                      Active Sessions
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage devices where you&apos;re currently logged in
                    </p>
                    <button className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50">
                      View Sessions
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Regional Tab */}
            {activeTab === "regional" && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  Regional Settings
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">
                        Eastern Time (ET)
                      </option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Los_Angeles">
                        Pacific Time (PT)
                      </option>
                      <option value="Asia/Jerusalem">
                        Israel Time (IST)
                      </option>
                      <option value="Europe/London">
                        London Time (GMT)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="en">English</option>
                      <option value="he">עברית (Hebrew)</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="fr">Français (French)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Coming soon - multiple language support
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="border-t border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}
