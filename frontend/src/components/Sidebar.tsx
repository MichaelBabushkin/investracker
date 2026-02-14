"use client";

import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { logout } from "@/store/slices/authSlice";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shield,
  LogOut,
  Globe2,
  Landmark,
  PieChart,
  Calendar,
  GraduationCap,
  X,
} from "lucide-react";
import Image from "next/image";

import type { LucideIcon } from "lucide-react";

interface SubItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavItem {
  name: string;
  href?: string;
  icon: LucideIcon;
  requiredRole?: "admin" | "user" | "viewer";
  subItems?: SubItem[];
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(
    new Set([""])
  );

  const handleLogout = () => {
    dispatch(logout());
    router.push("/");
  };

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(menuName)) {
        newSet.delete(menuName);
      } else {
        newSet.add(menuName);
      }
      return newSet;
    });
  };

  const navItems: NavItem[] = [
    { name: "Home", href: "/", icon: Home },
    {
      name: "Portfolio",
      icon: Briefcase,
      requiredRole: "viewer",
      subItems: [
        { name: "Overview", href: "/portfolio", icon: PieChart },
        { name: "World Stocks", href: "/world-stocks", icon: Globe2 },
        { name: "Israeli Stocks", href: "/israeli-stocks", icon: Landmark },
      ],
    },
    { name: "Analytics", href: "/analytics", icon: BarChart3, requiredRole: "viewer" },
    { name: "Calendar", href: "/calendar", icon: Calendar, requiredRole: "viewer" },
    { name: "Education", href: "/education", icon: GraduationCap, requiredRole: "viewer" },
    { name: "Settings", href: "/settings", icon: Settings, requiredRole: "viewer" },
    { name: "Admin", href: "/admin", icon: Shield, requiredRole: "admin" },
  ];

  const roleHierarchy: Record<string, number> = { admin: 3, user: 2, viewer: 1 };

  const canAccessItem = (item: NavItem): boolean => {
    if (!item.requiredRole) return true;
    if (!user) return false;
    const userRole = user.role?.toLowerCase() || "viewer";
    return (roleHierarchy[userRole] || 0) >= (roleHierarchy[item.requiredRole] || 0);
  };

  const filteredNavItems = navItems.filter(canAccessItem);

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isMenuActive = (item: NavItem) => {
    if (item.href) return isActive(item.href);
    if (item.subItems) return item.subItems.some((sub) => isActive(sub.href));
    return false;
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
        {!isCollapsed ? (
          <Image src="/images/investracker_logo-dark.svg" alt="Investracker" width={140} height={36} className="h-8 w-auto" />
        ) : (
          <Image src="/images/small_logo.svg" alt="Investracker" width={32} height={32} className="w-8 h-8 mx-auto" />
        )}
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/5 transition-colors text-gray-400"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 transition-colors text-gray-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isMenuActive(item);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus.has(item.name);

            return (
              <li key={item.name}>
                <button
                  onClick={() => {
                    if (hasSubItems) {
                      if (!isCollapsed) toggleMenu(item.name);
                    } else if (item.href) {
                      handleNavigation(item.href);
                    }
                  }}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center" : "justify-start"
                  } px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                    active && !hasSubItems
                      ? "bg-brand-400/10 text-brand-400"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon
                    size={20}
                    className={
                      active && !hasSubItems
                        ? "text-brand-400"
                        : "text-gray-500 group-hover:text-gray-300"
                    }
                  />
                  {!isCollapsed && (
                    <>
                      <span className="ml-3 text-sm font-medium flex-1 text-left">
                        {item.name}
                      </span>
                      {hasSubItems && (
                        isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                      {!hasSubItems && active && (
                        <div className="w-1.5 h-1.5 bg-brand-400 rounded-full" />
                      )}
                    </>
                  )}
                </button>

                {/* Sub-items */}
                {hasSubItems && !isCollapsed && isExpanded && (
                  <ul className="mt-1 ml-4 space-y-0.5 border-l border-white/5 pl-3">
                    {item.subItems!.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const subActive = isActive(subItem.href);
                      return (
                        <li key={subItem.name}>
                          <button
                            onClick={() => handleNavigation(subItem.href)}
                            className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-150 text-sm group ${
                              subActive
                                ? "bg-brand-400/10 text-brand-400"
                                : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                            }`}
                          >
                            <SubIcon size={16} className={subActive ? "text-brand-400" : "text-gray-600 group-hover:text-gray-400"} />
                            <span className="ml-2.5">{subItem.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      {user && (
        <div className="border-t border-white/5 p-3">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-brand-400/20 flex items-center justify-center text-brand-400 font-semibold text-sm">
              {user.first_name?.[0] || user.email[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {user.first_name || user.email.split("@")[0]}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user.role?.toLowerCase()}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-2 w-full flex items-center ${
              isCollapsed ? "justify-center" : "justify-start"
            } px-3 py-2 rounded-lg text-gray-500 hover:bg-loss/10 hover:text-loss transition-all duration-150 group`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut size={18} className="group-hover:text-loss" />
            {!isCollapsed && <span className="ml-3 text-sm">Logout</span>}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-[72px]" : "w-64"
        } bg-surface-dark-secondary border-r border-white/5`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-surface-dark-secondary border-r border-white/5 animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
