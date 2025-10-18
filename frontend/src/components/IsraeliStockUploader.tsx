"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { israeliStocksAPI } from "@/services/api";
import { UploadResult } from "@/types/israeli-stocks";

interface UploadedFile {
  file: File;
  status: "uploading" | "success" | "error";
  progress: number;
  result?: UploadResult;
  error?: string;
}

interface IsraeliStockUploaderProps {
  onUploadComplete?: (results: UploadResult[]) => void;
  maxFiles?: number;
}

export default function IsraeliStockUploader({
  onUploadComplete,
  maxFiles = 5,
}: IsraeliStockUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        file,
        status: "uploading" as const,
        progress: 0,
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      setIsUploading(true);

      const results: UploadResult[] = [];

      for (let i = 0; i < newFiles.length; i++) {
        const fileIndex = uploadedFiles.length + i;
        const file = newFiles[i].file;

        try {
          // Update progress
          setUploadedFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, progress: 25 } : f
            )
          );

          // Update progress
          setUploadedFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, progress: 50 } : f
            )
          );

          // Upload to Israeli Stocks API
          const result = await israeliStocksAPI.uploadPDF(file);

          // Update progress
          setUploadedFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? { ...f, progress: 100, status: "success" as const, result }
                : f
            )
          );

          results.push(result);
        } catch (error: any) {
          console.error("Upload error:", error);

          setUploadedFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? {
                    ...f,
                    status: "error" as const,
                    error:
                      error.response?.data?.detail ||
                      error.message ||
                      "Upload failed",
                  }
                : f
            )
          );
        }
      }

      setIsUploading(false);

      if (onUploadComplete && results.length > 0) {
        onUploadComplete(results);
      }
    },
    [uploadedFiles.length, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles,
    disabled: isUploading,
  });

  const clearFiles = () => {
    setUploadedFiles([]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const retryUpload = async (index: number) => {
    const file = uploadedFiles[index];
    if (!file || file.status === "uploading") return;

    setUploadedFiles((prev) =>
      prev.map((f, i) =>
        i === index
          ? {
              ...f,
              status: "uploading" as const,
              progress: 0,
              error: undefined,
            }
          : f
      )
    );

    try {
      setUploadedFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, progress: 50 } : f))
      );

      const result = await israeliStocksAPI.uploadPDF(file.file);

      setUploadedFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, progress: 100, status: "success" as const, result }
            : f
        )
      );

      if (onUploadComplete) {
        onUploadComplete([result]);
      }
    } catch (error: any) {
      setUploadedFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "error" as const,
                error:
                  error.response?.data?.detail ||
                  error.message ||
                  "Upload failed",
              }
            : f
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
          }
          ${isUploading ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input {...getInputProps()} />

        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />

        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            {isDragActive
              ? "Drop your Israeli investment PDFs here..."
              : "Upload Israeli Investment Reports"}
          </p>
          <p className="text-sm text-gray-500">
            Drag and drop PDF files, or click to browse
          </p>
          <p className="text-xs text-gray-400">
            Supports investment reports from Israeli brokers (TA-125 & SME-60
            stocks)
          </p>
        </div>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <button
              onClick={clearFiles}
              className="text-sm text-gray-500 hover:text-gray-700"
              disabled={isUploading}
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {uploadedFiles.map((uploadedFile, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 p-4 bg-white border border-gray-200 rounded-lg"
              >
                <DocumentIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>

                    <div className="flex items-center space-x-2">
                      {uploadedFile.status === "uploading" && (
                        <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />
                      )}

                      {uploadedFile.status === "success" && (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      )}

                      {uploadedFile.status === "error" && (
                        <div className="flex space-x-1">
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                          <button
                            onClick={() => retryUpload(index)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-gray-600"
                        disabled={uploadedFile.status === "uploading"}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1">
                    <div className="text-xs text-gray-500">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>

                    {uploadedFile.status === "uploading" && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadedFile.progress}%` }}
                        />
                      </div>
                    )}

                    {uploadedFile.status === "success" &&
                      uploadedFile.result && (
                        <div className="mt-2 text-xs">
                          <div className="text-green-600">
                            ✅ Processing completed successfully
                          </div>
                          <div className="text-gray-600 mt-1">
                            Holdings: {uploadedFile.result.holdings_found}{" "}
                            found, {uploadedFile.result.holdings_saved} saved |
                            Transactions:{" "}
                            {uploadedFile.result.transactions_found} found,{" "}
                            {uploadedFile.result.transactions_saved} saved
                          </div>
                          {uploadedFile.result.holding_date && (
                            <div className="text-gray-500">
                              Report Date: {uploadedFile.result.holding_date}
                            </div>
                          )}
                        </div>
                      )}

                    {uploadedFile.status === "error" && (
                      <div className="mt-2 text-xs text-red-600">
                        ❌ {uploadedFile.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
