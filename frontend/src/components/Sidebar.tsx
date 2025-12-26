"use client";

import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { logout } from "@/store/slices/authSlice";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeIcon,
  BriefcaseIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShieldCheckIcon,
  ArrowLeftOnRectangleIcon,
  GlobeAmericasIcon,
  BuildingLibraryIcon,
  ChartPieIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";

interface SubItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: "admin" | "user" | "viewer";
  subItems?: SubItem[];
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
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
    {
      name: "Home",
      href: "/",
      icon: HomeIcon,
    },
    {
      name: "Portfolio",
      icon: BriefcaseIcon,
      requiredRole: "viewer",
      subItems: [
        {
          name: "World Stocks",
          href: "/world-stocks",
          icon: GlobeAmericasIcon,
        },
        {
          name: "Israeli Stocks",
          href: "/israeli-stocks",
          icon: BuildingLibraryIcon,
        },
        {
          name: "Overview",
          href: "/portfolio",
          icon: ChartPieIcon,
        },
      ],
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: ChartBarIcon,
      requiredRole: "viewer",
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: CalendarIcon,
      requiredRole: "viewer",
    },
    {
      name: "Reports",
      href: "/reports",
      icon: DocumentTextIcon,
      requiredRole: "user",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Cog6ToothIcon,
      requiredRole: "viewer",
    },
    {
      name: "Admin Panel",
      href: "/admin",
      icon: ShieldCheckIcon,
      requiredRole: "admin",
    },
  ];

  const roleHierarchy: Record<string, number> = {
    admin: 3,
    user: 2,
    viewer: 1,
  };

  const canAccessItem = (item: NavItem): boolean => {
    if (!item.requiredRole) return true;
    if (!user) return false;

    const userRole = user.role?.toLowerCase() || "viewer";
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[item.requiredRole] || 0;

    return userLevel >= requiredLevel;
  };

  const filteredNavItems = navItems.filter(canAccessItem);

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isMenuActive = (item: NavItem) => {
    if (item.href) return isActive(item.href);
    if (item.subItems) {
      return item.subItems.some((sub) => isActive(sub.href));
    }
    return false;
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } bg-gray-900 text-white h-screen fixed left-0 top-0 transition-all duration-300 ease-in-out flex flex-col shadow-2xl z-50`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!isCollapsed ? (
          <div className="flex items-center space-x-2">
            <Image
              src="/images/investracker_logo.svg"
              alt="Investracker"
              width={100}
              height={100}
              className="w-[100%] h-[auto]"
            />
          </div>
        ) : (
          <Image
            src="/images/small_logo.svg"
            alt="Investracker"
            width={32}
            height={32}
            className="w-8 h-8"
          />
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        <ul className="space-y-2">
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
                      if (!isCollapsed) {
                        toggleMenu(item.name);
                      }
                    } else if (item.href) {
                      handleNavigation(item.href);
                    }
                  }}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center" : "justify-start"
                  } px-3 py-3 rounded-lg transition-all duration-200 group ${
                    active && !hasSubItems
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/50"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      active && !hasSubItems
                        ? "text-white"
                        : "text-gray-400 group-hover:text-white"
                    }`}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="ml-3 font-medium flex-1 text-left">
                        {item.name}
                      </span>
                      {hasSubItems &&
                        (isExpanded ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        ))}
                      {!hasSubItems && active && (
                        <div className="ml-auto w-1 h-6 bg-white rounded-full" />
                      )}
                    </>
                  )}
                </button>

                {/* Sub-items */}
                {hasSubItems && !isCollapsed && isExpanded && (
                  <ul className="mt-2 ml-3 space-y-1 border-l-2 border-gray-800 pl-4">
                    {item.subItems!.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const subActive = isActive(subItem.href);

                      return (
                        <li key={subItem.name}>
                          <button
                            onClick={() => handleNavigation(subItem.href)}
                            className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm group ${
                              subActive
                                ? "bg-blue-600 text-white shadow-md"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            }`}
                          >
                            <SubIcon
                              className={`w-5 h-5 ${
                                subActive
                                  ? "text-white"
                                  : "text-gray-500 group-hover:text-white"
                              }`}
                            />
                            <span className="ml-2">{subItem.name}</span>
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
        <div className="border-t border-gray-800 p-4">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
              {user.first_name?.[0] || user.email[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.first_name || user.email.split("@")[0]}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {user.role?.toLowerCase()}
                </p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`mt-3 w-full flex items-center ${
              isCollapsed ? "justify-center" : "justify-start"
            } px-3 py-2 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200 group`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 text-gray-400 group-hover:text-white" />
            {!isCollapsed && (
              <span className="ml-3 text-sm font-medium">Logout</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
