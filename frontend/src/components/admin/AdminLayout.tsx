"use client";

import React, { useState } from "react";
import {
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

export type AdminSection = "users" | "stocks" | "jobs";

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
    icon: UserGroupIcon,
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
    icon: ChartBarIcon,
    description: "Manage stock data, logos, and metadata",
    subcategories: [
      { id: "israeli", name: "Israeli Stocks", description: "Manage Israeli market stocks" },
      { id: "world", name: "World Stocks", description: "Manage international stocks" },
      { id: "logos", name: "Logo Crawler", description: "Fetch and update stock logos" },
      { id: "metadata", name: "Metadata", description: "Edit stock information manually" },
    ],
  },
  {
    id: "jobs",
    name: "Jobs & Tasks",
    icon: ClockIcon,
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-1">
            Manage system settings, users, and data
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-6">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Categories</h2>
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
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-5 h-5 ${
                              isActive ? "text-blue-600" : "text-gray-400"
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
                              <ChevronDownIcon className="w-4 h-4" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4" />
                            )}
                          </div>
                        )}
                      </button>

                      {/* Subcategories */}
                      {category.subcategories && isExpanded && (
                        <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                          {category.subcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="py-1.5 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
