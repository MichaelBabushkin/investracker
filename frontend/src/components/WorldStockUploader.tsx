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
import { worldStocksAPI } from "@/services/api";
import { WorldStockUploadResult } from "@/types/world-stocks";

interface UploadedFile {
  file: File;
  status: "uploading" | "success" | "error";
  progress: number;
  result?: WorldStockUploadResult;
  error?: string;
}

interface WorldStockUploaderProps {
  onUploadComplete?: (results: WorldStockUploadResult[]) => void;
  maxFiles?: number;
}

export default function WorldStockUploader({
  onUploadComplete,
  maxFiles = 5,
}: WorldStockUploaderProps) {
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

      const results: WorldStockUploadResult[] = [];

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

          // Upload to World Stocks API
          const result = await worldStocksAPI.uploadPDF(file);

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

      if (results.length > 0 && onUploadComplete) {
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

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }
          ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-lg text-blue-600">Drop the PDF files here...</p>
        ) : (
          <>
            <p className="text-lg text-gray-700 mb-2">
              Drag & drop world stock broker statements here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to select files (PDF only, max {maxFiles} files)
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              disabled={isUploading}
            >
              Select Files
            </button>
          </>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            {!isUploading && (
              <button
                onClick={clearAll}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            )}
          </div>

          {uploadedFiles.map((uploadedFile, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <DocumentIcon className="h-6 w-6 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>

                    {/* Status */}
                    {uploadedFile.status === "uploading" && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin" />
                          <span className="text-sm text-blue-600">
                            Processing...
                          </span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${uploadedFile.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadedFile.status === "success" &&
                      uploadedFile.result && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center space-x-2">
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">
                              Upload successful
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-0.5">
                            {uploadedFile.result.account_number && (
                              <p>
                                Account: {uploadedFile.result.account_number}
                              </p>
                            )}
                            <p>
                              Holdings: {uploadedFile.result.holdings_found}{" "}
                              found, {uploadedFile.result.holdings_saved} saved
                            </p>
                            <p>
                              Transactions:{" "}
                              {uploadedFile.result.transactions_found} found,{" "}
                              {uploadedFile.result.transactions_saved} saved
                            </p>
                            <p>
                              Dividends: {uploadedFile.result.dividends_found}{" "}
                              found, {uploadedFile.result.dividends_saved}{" "}
                              saved
                            </p>
                          </div>
                        </div>
                      )}

                    {uploadedFile.status === "error" && (
                      <div className="mt-2">
                        <div className="flex items-start space-x-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                          <div>
                            <span className="text-sm text-red-600 font-medium">
                              Upload failed
                            </span>
                            {uploadedFile.error && (
                              <p className="text-xs text-red-500 mt-1">
                                {uploadedFile.error}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!isUploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Supported Formats
        </h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• US broker account statements (PDF format)</li>
          <li>
            • Statements should include holdings, transactions, and dividend
            information
          </li>
          <li>• Files will be processed to extract stock data automatically</li>
        </ul>
      </div>
    </div>
  );
}
