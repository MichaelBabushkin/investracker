"use client";

import React, { useState } from "react";
import {
  Users,
  BarChart3,
  Clock,
  ChevronRight,
  DollarSign,
  Send,
} from "lucide-react";

export type AdminSection = "users" | "stocks" | "jobs" | "prices" | "telegram";

interface AdminCategory {
  id: AdminSection;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
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
  },
  {
    id: "stocks",
    name: "Stocks",
    icon: BarChart3,
    description: "Manage stock data, logos, and metadata",
  },
  {
    id: "prices",
    name: "Stock Prices",
    icon: DollarSign,
    description: "Monitor and refresh real-time stock prices",
  },
  {
    id: "jobs",
    name: "Jobs & Tasks",
    icon: Clock,
    description: "Run scheduled jobs, crons, and administrative tasks",
  },
  {
    id: "telegram",
    name: "Telegram Channels",
    icon: Send,  
    description: "Manage news channel sources and sync",
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeSection,
  onSectionChange,
}) => {
  return (
    <div className="min-h-screen bg-surface-dark pb-20 lg:pb-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100">Admin Panel</h1>
          <p className="text-gray-400 mt-1">
            Manage system settings, users, and data
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-surface-dark-secondary rounded-xl border border-white/10 overflow-hidden lg:sticky lg:top-6">
              <div className="p-4 border-b border-white/10 bg-surface-dark hidden lg:block">
                <h2 className="font-semibold text-gray-100">Categories</h2>
              </div>
              <nav className="p-2 space-y-1">
                {adminCategories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeSection === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => onSectionChange(category.id)}
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
                          <div className="text-xs text-gray-500 mt-0.5 hidden lg:block">
                            {category.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isActive ? "text-brand-400" : "text-gray-500"} lg:hidden`} />
                    </button>
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
