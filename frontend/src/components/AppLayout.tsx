"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { RootState } from "@/store";
import Sidebar from "./Sidebar";
import EventBanner from "./EventBanner";
import {
  Home,
  Briefcase,
  BarChart3,
  GraduationCap,
  Settings,
  Menu,
} from "lucide-react";
import Image from "next/image";

interface AppLayoutProps {
  children: React.ReactNode;
}

/* ── Mobile Bottom Tab Bar ── */
const MobileBottomBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: "Home", href: "/", icon: Home },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Learn", href: "/education", icon: GraduationCap },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-dark-secondary/95 backdrop-blur-lg border-t border-white/5 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.href)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? "text-brand-400" : "text-gray-500"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-1 font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/* ── Mobile Top Bar ── */
const MobileTopBar: React.FC<{ onMenuOpen: () => void }> = ({ onMenuOpen }) => (
  <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 bg-surface-dark/95 backdrop-blur-lg border-b border-white/5">
    <button onClick={onMenuOpen} className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-gray-400">
      <Menu size={22} />
    </button>
    <Image src="/images/investracker_logo-dark.svg" alt="Investracker" width={120} height={30} className="h-6 w-auto" />
    <div className="w-9" /> {/* Spacer for centering */}
  </header>
);

/* ── Main Layout ── */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isInitialized } = useSelector(
    (state: RootState) => state.auth
  );

  if (!isInitialized) return <>{children}</>;
  if (!isAuthenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-surface-dark">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Mobile top bar */}
      <MobileTopBar onMenuOpen={() => setMobileOpen(true)} />

      {/* Main content area — margin only on desktop */}
      <div
        className="transition-all duration-300"
        style={{ marginLeft: isSidebarCollapsed ? undefined : undefined }}
      >
        {/* Desktop spacer — pushes content right of the fixed sidebar */}
        <div className={`hidden lg:block transition-all duration-300 ${isSidebarCollapsed ? "pl-[72px]" : "pl-64"}`}>
          <EventBanner />
        </div>
        <div className="lg:hidden">
          <EventBanner />
        </div>
        <main className={`pb-20 lg:pb-0 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"}`}>
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileBottomBar />
    </div>
  );
};

export default AppLayout;
