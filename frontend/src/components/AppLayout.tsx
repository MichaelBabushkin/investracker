"use client";

import React, { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { RootState, AppDispatch } from "@/store";
import { logout } from "@/store/slices/authSlice";
import Sidebar from "./Sidebar";
import EventBanner from "./EventBanner";
import {
  Home,
  Briefcase,
  BarChart3,
  GraduationCap,
  Settings,
  Menu,
  Calendar,
  Shield,
  Globe2,
  Landmark,
  PieChart,
  X,
  LogOut,
  FileText,
} from "lucide-react";
import Image from "next/image";

interface AppLayoutProps {
  children: React.ReactNode;
}

/* ── Portfolio sub-menu popup ── */
const PortfolioPopup: React.FC<{
  anchorLeft: number;
  onNavigate: (href: string) => void;
  onClose: () => void;
}> = ({ anchorLeft, onNavigate, onClose }) => {
  const pathname = usePathname();

  const subItems = [
    { name: "Overview", href: "/portfolio", icon: PieChart },
    { name: "World Stocks", href: "/world-stocks", icon: Globe2 },
    { name: "Israeli Stocks", href: "/israeli-stocks", icon: Landmark },
  ];

  return (
    <>
      {/* Invisible backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} />
      {/* Popup card */}
      <div
        className="fixed bottom-[72px] z-50 bg-surface-dark-secondary border border-white/10 rounded-xl shadow-2xl p-2 w-48"
        style={{ left: Math.max(8, Math.min(anchorLeft, window.innerWidth - 200)) }}
      >
        {subItems.map(({ name, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/portfolio" && pathname.startsWith(href));
          return (
            <button
              key={name}
              onClick={() => { onNavigate(href); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-brand-400/10 text-brand-400"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <Icon size={17} className={active ? "text-brand-400" : "text-gray-500"} />
              {name}
            </button>
          );
        })}
      </div>
    </>
  );
};

/* ── Mobile Bottom Tab Bar ── */
const MobileBottomBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [popupLeft, setPopupLeft] = useState(0);
  const portfolioTabRef = useRef<HTMLButtonElement>(null);

  const isPortfolioSection =
    pathname.startsWith("/portfolio") ||
    pathname.startsWith("/world-stocks") ||
    pathname.startsWith("/israeli-stocks");

  const tabs = [
    { name: "Home", href: "/", icon: Home },
    { name: "Portfolio", href: null, icon: Briefcase },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Learn", href: "/education", icon: GraduationCap },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const isActive = (href: string | null) => {
    if (!href) return isPortfolioSection;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handlePortfolioTap = () => {
    if (portfolioTabRef.current) {
      const rect = portfolioTabRef.current.getBoundingClientRect();
      setPopupLeft(rect.left + rect.width / 2 - 96);
    }
    setPortfolioOpen((prev) => !prev);
  };

  return (
    <>
      {portfolioOpen && (
        <PortfolioPopup
          anchorLeft={popupLeft}
          onNavigate={(href) => router.push(href)}
          onClose={() => setPortfolioOpen(false)}
        />
      )}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-dark-secondary/95 backdrop-blur-lg border-t border-white/5 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            const isPortfolioTab = tab.name === "Portfolio";
            return (
              <button
                key={tab.name}
                ref={isPortfolioTab ? portfolioTabRef : undefined}
                onClick={
                  isPortfolioTab
                    ? handlePortfolioTap
                    : () => {
                        setPortfolioOpen(false);
                        router.push(tab.href!);
                      }
                }
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
    </>
  );
};

/* ── Mobile Drawer — only items NOT in the bottom bar ── */
const MobileDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();

  const drawerItems = [
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Reports", href: "/reports", icon: FileText },
    ...(user?.role?.toLowerCase() === "admin"
      ? [{ name: "Admin", href: "/admin", icon: Shield }]
      : []),
  ];

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push("/");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 h-full w-64 bg-surface-dark-secondary border-r border-white/5 flex flex-col animate-slide-in-left">
        {/* Header with logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          <Image
            src="/images/investracker_logo.svg"
            alt="Investracker"
            width={140}
            height={36}
            className="h-8 w-auto"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-3 mb-2">
            More
          </p>
          {drawerItems.map(({ name, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <button
                key={name}
                onClick={() => navigate(href)}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all text-sm ${
                  active
                    ? "bg-brand-400/10 text-brand-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                <Icon
                  size={20}
                  className={active ? "text-brand-400" : "text-gray-500"}
                />
                <span className="ml-3 font-medium">{name}</span>
              </button>
            );
          })}
        </nav>

        {/* User info + logout */}
        {user && (
          <div className="border-t border-white/5 p-3">
            <div className="flex items-center px-2 py-2 mb-1">
              <div className="w-9 h-9 rounded-full bg-brand-400/20 flex items-center justify-center text-brand-400 font-semibold text-sm flex-shrink-0">
                {user.first_name?.[0] || user.email[0].toUpperCase()}
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {user.first_name || user.email.split("@")[0]}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user.role?.toLowerCase()}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 rounded-lg text-gray-500 hover:bg-loss/10 hover:text-loss transition-all duration-150 group text-sm"
            >
              <LogOut size={18} className="group-hover:text-loss" />
              <span className="ml-3">Logout</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

/* ── Mobile Top Bar ── */
const MobileTopBar: React.FC<{ onMenuOpen: () => void }> = ({ onMenuOpen }) => (
  <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 bg-surface-dark/95 backdrop-blur-lg border-b border-white/5">
    <button
      onClick={onMenuOpen}
      className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-gray-400"
    >
      <Menu size={22} />
    </button>
    <Image
      src="/images/investracker_logo.svg"
      alt="Investracker"
      width={120}
      height={30}
      className="h-6 w-auto"
    />
    <div className="w-9" />
  </header>
);

/* ── Main Layout ── */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isInitialized } = useSelector(
    (state: RootState) => state.auth
  );

  if (!isInitialized) return <>{children}</>;
  if (!isAuthenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Desktop sidebar only */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        mobileOpen={false}
        setMobileOpen={() => {}}
      />

      {/* Mobile drawer — calendar + admin only */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Mobile top bar */}
      <MobileTopBar onMenuOpen={() => setMobileOpen(true)} />

      {/* Main content area */}
      <div className="transition-all duration-300">
        <div
          className={`hidden lg:block transition-all duration-300 ${
            isSidebarCollapsed ? "pl-[72px]" : "pl-64"
          }`}
        >
          <EventBanner />
        </div>
        <div className="lg:hidden">
          <EventBanner />
        </div>
        <main
          className={`pb-20 lg:pb-0 transition-all duration-300 ${
            isSidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileBottomBar />
    </div>
  );
};

export default AppLayout;
