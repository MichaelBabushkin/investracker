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

type Theme = "light" | "dark" | "auto";
type Currency = "USD" | "ILS" | "EUR" | "GBP";

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
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme;
    const savedCurrency = localStorage.getItem("baseCurrency") as Currency;
    
    if (savedTheme) setTheme(savedTheme);
    if (savedCurrency) setBaseCurrency(savedCurrency);
  }, []);

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

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar - Horizontal scroll on mobile */}
          <div className="w-full lg:w-64 bg-white rounded-lg shadow p-2 sm:p-4">
            <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 lg:space-y-1 pb-2 lg:pb-0 -mx-2 px-2 lg:mx-0 lg:px-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 lg:w-full flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                    <span className="text-xs lg:text-base">{tab.name}</span>
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
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {[
                      { value: "light", label: "Light", emoji: "☀️" },
                      { value: "dark", label: "Dark", emoji: "🌙" },
                      { value: "auto", label: "Auto", emoji: "🔄" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as Theme)}
                        className={`p-3 sm:p-4 border-2 rounded-lg transition-all ${
                          theme === option.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{option.emoji}</div>
                        <div className="text-sm sm:text-base font-medium text-gray-900">
                          {option.label}
                        </div>
                        {option.value === "auto" && (
                          <div className="text-xs text-gray-500 mt-1">
                            Matches system
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
                  <div className="flex gap-2 sm:gap-3">
                    {["blue", "green", "purple", "red", "orange"].map(
                      (color) => (
                        <button
                          key={color}
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ${
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
                      Manage devices where you're currently logged in
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
  );
}
