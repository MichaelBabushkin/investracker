"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { authAPI, reportsAPI } from "@/services/api";

interface UploadedFile {
  file: File;
  status: "uploading" | "success" | "error";
  progress: number;
  result?: any;
  error?: string;
}

interface ReportUploaderProps {
  onUploadComplete?: (results: any[]) => void;
  maxFiles?: number;
}

export default function ReportUploader({
  onUploadComplete,
  maxFiles = 5,
}: ReportUploaderProps) {
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

      const results = [];

      for (let i = 0; i < newFiles.length; i++) {
        const fileIndex = uploadedFiles.length + i;
        const file = newFiles[i].file;

        try {
          // Create FormData
          const formData = new FormData();
          formData.append("file", file);

          // Update progress
          setUploadedFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, progress: 50 } : f
            )
          );

          // Upload file
          const result = await reportsAPI.uploadReport(file);

          // Update success
          setUploadedFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? {
                    ...f,
                    status: "success" as const,
                    progress: 100,
                    result,
                  }
                : f
            )
          );

          results.push(result);
        } catch (error) {
          // Update error
          setUploadedFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? {
                    ...f,
                    status: "error" as const,
                    progress: 0,
                    error:
                      error instanceof Error ? error.message : "Upload failed",
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
    maxFiles: maxFiles,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "error":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary-500 bg-primary-50"
            : "border-gray-300 hover:border-gray-400"
        } ${isUploading ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />

        {isDragActive ? (
          <p className="mt-2 text-lg text-primary-600">
            Drop your PDF reports here...
          </p>
        ) : (
          <div>
            <p className="mt-2 text-lg text-gray-600">
              Drag & drop your PDF investment reports here
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse files
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: Fidelity statements, portfolio reports, transaction
              history (PDF only, max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>

          {uploadedFiles.map((uploadedFile, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(uploadedFile.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {uploadedFile.status === "uploading" && (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadedFile.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {uploadedFile.progress}%
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    disabled={uploadedFile.status === "uploading"}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Success Details */}
              {uploadedFile.status === "success" && uploadedFile.result && (
                <div className="mt-3 p-3 bg-green-50 rounded-md">
                  <div className="text-sm text-green-800">
                    <p>
                      <strong>Broker:</strong>{" "}
                      {uploadedFile.result.data?.broker || "Unknown"}
                    </p>
                    <p>
                      <strong>Holdings found:</strong>{" "}
                      {uploadedFile.result.data?.holdings?.length || 0}
                    </p>
                    <p>
                      <strong>Transactions found:</strong>{" "}
                      {uploadedFile.result.data?.transactions?.length || 0}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {uploadedFile.status === "error" && uploadedFile.error && (
                <div className="mt-3 p-3 bg-red-50 rounded-md">
                  <p className="text-sm text-red-800">{uploadedFile.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
