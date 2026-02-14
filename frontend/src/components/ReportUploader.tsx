"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, AlertTriangle, X } from "lucide-react";
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
        return <CheckCircle className="h-5 w-5 text-gain" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-loss" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-brand-400/40 bg-brand-400/10"
            : "border-white/10 hover:border-white/20"
        } ${isUploading ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-500" />

        {isDragActive ? (
          <p className="mt-2 text-lg text-brand-400">
            Drop your PDF reports here...
          </p>
        ) : (
          <div>
            <p className="mt-2 text-lg text-gray-400">
              Drag & drop your PDF investment reports here
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse files
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supports: Fidelity statements, portfolio reports, transaction
              history (PDF only, max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-medium text-gray-100">Uploaded Files</h3>

          {uploadedFiles.map((uploadedFile, index) => (
            <div
              key={index}
              className="bg-surface-dark-secondary border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(uploadedFile.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-100">
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
                      <div className="w-16 bg-white/10 rounded-full h-2">
                        <div
                          className="bg-brand-400 h-2 rounded-full transition-all duration-300"
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
                    className="p-1 text-gray-500 hover:text-gray-300"
                    disabled={uploadedFile.status === "uploading"}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Success Details */}
              {uploadedFile.status === "success" && uploadedFile.result && (
                <div className="mt-3 p-3 bg-gain/10 rounded-md">
                  <div className="text-sm text-gain">
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
                <div className="mt-3 p-3 bg-loss/10 rounded-md">
                  <p className="text-sm text-loss">{uploadedFile.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
