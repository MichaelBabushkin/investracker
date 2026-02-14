"use client";

import React, { useState } from "react";
import {
  Users,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronRight,
  DollarSign,
} from "lucide-react";

export type AdminSection = "users" | "stocks" | "jobs" | "prices";

interface AdminCategory {
  id: AdminSection;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  subcategories?: {
    id: string;
    name: string;
    description: string;
  }[];
}

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}

const adminCategories: AdminCategory[] = [
  {
    id: "users",
    name: "Users",
    icon: Users,
    description: "Manage user accounts, permissions, and roles",
    subcategories: [
      { id: "list", name: "User List", description: "View and manage all users" },
      { id: "roles", name: "Roles & Permissions", description: "Configure user roles" },
      { id: "activity", name: "Activity Log", description: "View user activity" },
    ],
  },
  {
    id: "stocks",
    name: "Stocks",
    icon: BarChart3,
    description: "Manage stock data, logos, and metadata",
    subcategories: [
      { id: "israeli", name: "Israeli Stocks", description: "Manage Israeli market stocks" },
      { id: "world", name: "World Stocks", description: "Manage international stocks" },
      { id: "logos", name: "Logo Crawler", description: "Fetch and update stock logos" },
      { id: "metadata", name: "Metadata", description: "Edit stock information manually" },
    ],
  },
  {
    id: "prices",
    name: "Stock Prices",
    icon: DollarSign,
    description: "Monitor and refresh real-time stock prices",
    subcategories: [
      { id: "dashboard", name: "Dashboard", description: "View price statistics and freshness" },
      { id: "refresh", name: "Manual Refresh", description: "Trigger price updates on demand" },
      { id: "monitoring", name: "Monitoring", description: "Track update history and errors" },
    ],
  },
  {
    id: "jobs",
    name: "Jobs & Tasks",
    icon: Clock,
    description: "Run scheduled jobs, crons, and administrative tasks",
    subcategories: [
      { id: "scheduled", name: "Scheduled Jobs", description: "View and manage cron jobs" },
      { id: "manual", name: "Manual Tasks", description: "Run administrative tasks on demand" },
      { id: "cache", name: "Cache Management", description: "Clear and manage cache" },
      { id: "history", name: "Job History", description: "View execution history" },
    ],
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeSection,
  onSectionChange,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<AdminSection>>(
    new Set([activeSection])
  );

  const toggleCategory = (categoryId: AdminSection) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100">Admin Panel</h1>
          <p className="text-gray-400 mt-1">
            Manage system settings, users, and data
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-surface-dark-secondary rounded-xl border border-white/10 overflow-hidden sticky top-6">
              <div className="p-4 border-b border-white/10 bg-surface-dark">
                <h2 className="font-semibold text-gray-100">Categories</h2>
              </div>
              <nav className="p-2">
                {adminCategories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeSection === category.id;
                  const isExpanded = expandedCategories.has(category.id);

                  return (
                    <div key={category.id} className="mb-1">
                      <button
                        onClick={() => {
                          onSectionChange(category.id);
                          toggleCategory(category.id);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                          isActive
                            ? "bg-brand-400/10 text-brand-400"
                            : "text-gray-300 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-5 h-5 ${
                              isActive ? "text-brand-400" : "text-gray-400"
                            }`}
                          />
                          <div className="text-left">
                            <div className="font-medium text-sm">
                              {category.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {category.description}
                            </div>
                          </div>
                        </div>
                        {category.subcategories && (
                          <div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        )}
                      </button>

                      {/* Subcategories */}
                      {category.subcategories && isExpanded && (
                        <div className="ml-8 mt-1 space-y-1 border-l-2 border-white/10 pl-3">
                          {category.subcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="py-1.5 text-sm text-gray-400 hover:text-gray-100 cursor-pointer"
                            >
                              {sub.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-surface-dark-secondary rounded-xl border border-white/10">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
