"use client";

import React, { useState, useRef } from "react";
import { Upload } from "lucide-react";

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
  const handleDragLeave = () => setIsDragging(false);
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
  const handleClick = () => fileInputRef.current?.click();

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all select-none group min-h-[130px]
        ${isDragging
          ? "border-brand-400 bg-brand-400/10"
          : "border-white/10 bg-surface-dark hover:border-brand-400/50 hover:bg-white/5"
        }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Logo */}
      <div className="w-24 h-12 flex items-center justify-center rounded-md overflow-hidden">
        {brokerIcon || <Upload className="h-6 w-6 text-gray-500" />}
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-gray-300 text-center leading-tight">
        {brokerName}
      </p>

      {/* Upload hint icon */}
      <Upload
        size={13}
        className={`transition-colors ${isDragging ? "text-brand-400" : "text-gray-600 group-hover:text-brand-400/60"}`}
      />
    </div>
  );
}
