"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  RefreshCw,
} from "lucide-react";
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
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? "border-brand-400 bg-brand-400/10"
              : "border-white/10 hover:border-white/20"
          }
          ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-lg text-brand-400">Drop the PDF files here...</p>
        ) : (
          <>
            <p className="text-lg text-gray-300 mb-2">
              Drag & drop world stock broker statements here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to select files (PDF only, max {maxFiles} files)
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-brand-400 text-surface-dark rounded-md hover:bg-brand-500 transition-colors"
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
                className="text-sm text-loss hover:text-loss"
              >
                Clear All
              </button>
            )}
          </div>

          {uploadedFiles.map((uploadedFile, index) => (
            <div
              key={index}
              className="border border-white/10 rounded-xl p-4 bg-surface-dark-secondary"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <FileText className="h-6 w-6 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>

                    {/* Status */}
                    {uploadedFile.status === "uploading" && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-4 w-4 text-brand-400 animate-spin" />
                          <span className="text-sm text-brand-400">
                            Processing...
                          </span>
                        </div>
                        <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-400 transition-all duration-300"
                            style={{ width: `${uploadedFile.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadedFile.status === "success" &&
                      uploadedFile.result && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-gain" />
                            <span className="text-sm text-gain font-medium">
                              Upload successful
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 space-y-0.5">
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
                              found, {uploadedFile.result.dividends_saved} saved
                            </p>
                          </div>
                        </div>
                      )}

                    {uploadedFile.status === "error" && (
                      <div className="mt-2">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-5 w-5 text-loss flex-shrink-0" />
                          <div>
                            <span className="text-sm text-loss font-medium">
                              Upload failed
                            </span>
                            {uploadedFile.error && (
                              <p className="text-xs text-loss mt-1">
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
                    className="text-gray-400 hover:text-gray-300 flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-brand-400/10 border border-brand-400/20 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-brand-400 mb-2">
          Supported Formats
        </h4>
        <ul className="text-xs text-gray-300 space-y-1">
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
