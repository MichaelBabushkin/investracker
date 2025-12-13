"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { israeliStocksAPI } from "@/services/api";
import { DocumentArrowDownIcon, EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Report {
  id: number;
  filename: string;
  file_size: number;
  broker: string;
  upload_batch_id: string;
  upload_date: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await israeliStocksAPI.getReports();
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId: number, filename: string) => {
    try {
      const blob = await israeliStocksAPI.downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to download report");
    }
  };

  const handlePreview = async (report: Report) => {
    try {
      setError(null);
      const blob = await israeliStocksAPI.downloadReport(report.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewReport(report);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to preview report");
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewReport(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Investment Reports
          </h1>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Investment Reports
          </h1>
          <button
            onClick={() => router.push("/israeli-stocks")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Upload New Report
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Reports Table */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No reports uploaded yet</p>
            <button
              onClick={() => router.push("/israeli-stocks")}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Upload your first report
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Broker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Size
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {report.filename}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                          {report.broker}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(report.upload_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(report.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handlePreview(report)}
                            className="text-purple-600 hover:text-purple-900 inline-flex items-center"
                            title="Preview PDF"
                          >
                            <EyeIcon className="h-5 w-5 mr-1" />
                            Preview
                          </button>
                          <button
                            onClick={() =>
                              handleDownload(report.id, report.filename)
                            }
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            title="Download PDF"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5 mr-1" />
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {reports.length > 0 && (
          <div className="mt-6 text-sm text-gray-600">
            Total Reports: {reports.length}
          </div>
        )}

        {/* Preview Modal */}
        {previewReport && previewUrl && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={closePreview}
              ></div>

              {/* Modal panel */}
              <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {previewReport.filename}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(previewReport.upload_date)} • {formatFileSize(previewReport.file_size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(previewReport.id, previewReport.filename)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center px-3 py-1.5 border border-blue-600 rounded-md"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    <button
                      onClick={closePreview}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* PDF Viewer */}
                <div className="w-full" style={{ height: "80vh" }}>
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
