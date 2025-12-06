"use client";

import React, { useState, useRef } from "react";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";

interface BrokerUploadCardProps {
  brokerName: string;
  brokerIcon?: React.ReactNode;
  onUpload: (files: FileList) => void;
}

export default function BrokerUploadCard({
  brokerName,
  brokerIcon,
  onUpload,
}: BrokerUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors overflow-hidden">
      {/* Broker Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-24 h-12 bg-white rounded-md flex items-center justify-center">
            {brokerIcon || (
              <CloudArrowUpIcon className="h-7 w-7 text-blue-600" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-white">{brokerName}</h3>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`p-6 cursor-pointer transition-all ${
          isDragging
            ? "bg-blue-50 border-blue-400"
            : "bg-white hover:bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col items-center justify-center text-center min-h-[160px]">
          <CloudArrowUpIcon
            className={`h-12 w-12 mb-3 ${
              isDragging ? "text-blue-600" : "text-gray-400"
            }`}
          />
          <p className="text-sm font-medium text-gray-900 mb-1">
            Upload {brokerName} Reports
          </p>
          <p className="text-xs text-gray-500">
            Drag and drop PDF files, or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Supports investment reports from {brokerName} brokers
          </p>
        </div>
      </div>
    </div>
  );
}
