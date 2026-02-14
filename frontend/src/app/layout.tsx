import React from "react";
import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { Toaster } from "react-hot-toast";
import AppLayout from "@/components/AppLayout";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Investracker - Investment Portfolio Tracker",
  description:
    "Track and analyze your investment portfolio with comprehensive analytics",
  icons: {
    icon: [
      { url: "/favicon.svg" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable} dark`}>
      <body className="font-body antialiased bg-surface-dark text-gray-100">
        <Providers>
          <AppLayout>{children}</AppLayout>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1F2937",
                color: "#F9FAFB",
                border: "1px solid #374151",
                borderRadius: "12px",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#4ADE80",
                  secondary: "#052E16",
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: "#F43F5E",
                  secondary: "#fff",
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
