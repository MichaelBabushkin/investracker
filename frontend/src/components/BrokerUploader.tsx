"use client";

import React, { useState } from "react";
import BrokerUploadCard from "./BrokerUploadCard";
import { UploadResult } from "@/types/israeli-stocks";
import { israeliStocksAPI } from "@/services/api";

interface BrokerUploaderProps {
  onUploadComplete: (results: UploadResult[]) => void;
}

// Broker definitions
const BROKERS = [
  {
    id: "excellence",
    name: "Excellence",
    icon: "excellenceTrade.png",
    enabled: true,
  },
  {
    id: "meitav",
    name: "Meitav",
    icon: "meitav.jpg",
    enabled: false, // Not yet implemented
  },
  {
    id: "ibi",
    name: "IBI",
    icon: "IBI.png",
    enabled: false,
  },
  {
    id: "altshuler",
    name: "Altshuler",
    icon: "altshulerShaham.jpg",
    enabled: false,
  },
  {
    id: "interactive-brokers",
    name: "Interactive Brokers",
    icon: "InteractiveLogo.png",
    enabled: false,
  },
  {
    id: "psagot",
    name: "Psagot",
    icon: "psagot.png",
    enabled: false,
  },
];

// Bank definitions
const BANKS = [
  {
    id: "hapoalim",
    name: "Bank Hapoalim",
    icon: "bank_hapoalim.jpg",
    enabled: false,
  },
  {
    id: "leumi",
    name: "Bank Leumi",
    icon: "bank_leumi.jpg",
    enabled: false,
  },
  {
    id: "discount",
    name: "Discount Bank",
    icon: "Discount.jpg",
    enabled: false,
  },
  {
    id: "mizrahi",
    name: "Mizrahi Tefahot",
    icon: "mizrachi_tfachot.png",
    enabled: false,
  },
];

export default function BrokerUploader({
  onUploadComplete,
}: BrokerUploaderProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBrokerUpload = async (brokerId: string, files: FileList) => {
    setUploading(brokerId);
    setError(null);
    setSuccess(null);

    const broker = [...BROKERS, ...BANKS].find((b) => b.id === brokerId);

    if (!broker?.enabled) {
      setError(
        `${broker?.name} support is coming soon. Currently, only Excellence is supported.`
      );
      setUploading(null);
      return;
    }

    try {
      const filesArray = Array.from(files);
      const results = await israeliStocksAPI.upload(filesArray, brokerId);

      const totalHoldings = results.reduce(
        (sum: number, r: any) => sum + (r.holdings_saved || 0),
        0
      );
      const totalTransactions = results.reduce(
        (sum: number, r: any) => sum + (r.transactions_saved || 0),
        0
      );
      const totalDividends = results.reduce(
        (sum: number, r: any) => sum + (r.dividends_saved || 0),
        0
      );

      setSuccess(
        `Successfully processed ${files.length} file(s): ${totalHoldings} holdings, ${totalTransactions} transactions, ${totalDividends} dividends`
      );

      onUploadComplete(results);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(
        err.response?.data?.detail || err.message || "Upload failed"
      );
    } finally {
      setUploading(null);
    }
  };

  return (
    <div>
      {/* Status Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {uploading && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-800">
              Processing {uploading} reports...
            </p>
          </div>
        </div>
      )}

      {/* Broker Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BROKERS.map((broker) => (
          <div key={broker.id} className="relative">
            <BrokerUploadCard
              brokerName={broker.name}
              brokerIcon={
                broker.icon ? (
                  <img
                    src={`/brokers/${broker.icon}`}
                    alt={broker.name}
                    className="w-full h-full object-contain"
                  />
                ) : null
              }
              onUpload={(files) => handleBrokerUpload(broker.id, files)}
            />
            {!broker.enabled && (
              <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center">
                <span className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                  Coming Soon
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Banks Section */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Israeli Banks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BANKS.map((bank) => (
            <div key={bank.id} className="relative">
              <BrokerUploadCard
                brokerName={bank.name}
                brokerIcon={
                  bank.icon ? (
                    <img
                      src={`/brokers/${bank.icon}`}
                      alt={bank.name}
                      className="w-full h-full object-contain"
                    />
                  ) : null
                }
                onUpload={(files) => handleBrokerUpload(bank.id, files)}
              />
              {!bank.enabled && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center">
                  <span className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                    Coming Soon
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Information Note */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          About Israeli Broker & Bank Support
        </h4>
        <p className="text-sm text-blue-800">
          Each broker and bank has its own PDF format. Currently, Excellence is fully
          supported. We're actively working on adding support for Meitav, IBI,
          Altshuler, Interactive Brokers, and major Israeli banks.
        </p>
      </div>
    </div>
  );
}
