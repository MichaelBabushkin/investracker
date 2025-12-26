"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Sidebar from "./Sidebar";
import EventBanner from "./EventBanner";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isAuthenticated, isInitialized } = useSelector(
    (state: RootState) => state.auth
  );

  // Don't show sidebar until auth is initialized
  if (!isInitialized) {
    return <>{children}</>;
  }

  // Don't show sidebar for unauthenticated users
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className={`transition-all duration-300 ${isSidebarCollapsed ? "ml-20" : "ml-64"}`}>
          <EventBanner />
        </div>
        <main 
          className={`flex-1 transition-all duration-300 ${
            isSidebarCollapsed ? "ml-20" : "ml-64"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
